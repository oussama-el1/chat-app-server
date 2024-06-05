const app = require("./app");
const dotenv = require("dotenv");
const path = require("path");


const mongoose = require("mongoose");


mongoose.set('strictQuery', false);



dotenv.config({ path: "./config.env" });


process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
});

const { Server } = require("socket.io");
const http = require("http");

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});




const DB = process.env.DBURI.replace("<password>", process.env.DBPWD);

mongoose.connect(DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
}).then(() => {
  console.log("DB connection successful");
}).catch((err) => {
  console.log(err);
})

const port = process.env.port || 8000;

httpServer.listen(port, () => {
  console.log(`App is running on port ${port}`)
});


const User = require("./models/user");
const FriendRequest = require("./models/friendRequest");
const OneToOneMessage = require("./models/OneToOneMessage");


io.on("connection", async (socket) => {

  console.log(JSON.stringify(socket.handshake.query));
  const user_id = socket.handshake.query["user_id"];

  console.log(`User connected ${socket.id}`);

  if (user_id != null && Boolean(user_id)) {
    try {
      await User.findByIdAndUpdate(user_id, {
        socket_id: socket.id,
        status: "Online",
      });
    } catch (e) {
      console.log(e);
      console.log("Usr not found !!");
    }
  }

  // listen for event => "friend_request"
  socket.on("friend_request", async (data) => {
    const to = await User.findById(data.to).select("socket_id");
    const from = await User.findById(data.from).select("socket_id");

    // create a friend request
    await FriendRequest.create({
      sender: data.from,
      recipient: data.to,
    });

    // emit event request received to recipient
    io.to(to?.socket_id).emit("new_friend_request", {
      message: "New friend request received",
    });
    io.to(from?.socket_id).emit("request_sent", {
      message: "Request Sent successfully!",
    });
  });

  // listen for event => "accept_request"
  socket.on("accept_request", async (data) => {
    // accept friend request => add ref of each other in friends array
    console.log(data);
    const request_doc = await FriendRequest.findById(data.request_id);

    console.log(request_doc);

    const sender = await User.findById(request_doc.sender);
    const receiver = await User.findById(request_doc.recipient);

    if (!sender || !receiver) {
      console.log("User not found");
      return;
    }

    if (sender.friends.includes(request_doc.recipient)) {
      console.log("Already friends");
      // delete the request
      await FriendRequest.findByIdAndDelete(data.request_id);
      return;
    }

    sender.friends.push(request_doc.recipient);
    receiver.friends.push(request_doc.sender);

    await receiver.save({ new: true, validateModifiedOnly: true });
    await sender.save({ new: true, validateModifiedOnly: true });

    await FriendRequest.findByIdAndDelete(data.request_id);

    // delete this request doc
    // emit event to both of them

    // emit event request accepted to both
    io.to(sender?.socket_id).emit("request_accepted", {
      message: "Friend Request Accepted",
    });
    io.to(receiver?.socket_id).emit("request_accepted", {
      message: "Friend Request Accepted",
    });
  });

  // get list of conversation
  socket.on("get_direct_conversations", async ({ user_id }, callback) => {

    // sherch for existing conversations where user_id is in participants
    const existing_conversations = await OneToOneMessage.find({
      participants: { $all: [user_id] },
    }).populate("participants", "firstName lastName avatar _id email status");

    console.log(existing_conversations);

    callback(existing_conversations);
  });

  // start conversation
  socket.on("start_conversation", async (data) => {
    // data: {to: from:}

    const { to, from } = data;

    // check if there is any existing conversation

    const existing_conversations = await OneToOneMessage.find({
      participants: { $size: 2, $all: [to, from] },
    }).populate("participants", "firstName lastName _id email status");

    console.log(existing_conversations[0], "Existing Conversation");

    // if no => create a new OneToOneMessage doc & emit event "start_chat" & send conversation details as payload
    if (existing_conversations.length === 0) {
      let new_chat = await OneToOneMessage.create({
        participants: [to, from],
      });

      new_chat = await OneToOneMessage.findById(new_chat).populate(
        "participants",
        "firstName lastName _id email status"
      );

      console.log(new_chat);

      socket.emit("start_chat", new_chat);
    }
    // if yes => just emit event "start_chat" & send conversation details as payload
    else {
      socket.emit("start_chat", existing_conversations[0]);
    }
  });

  // get messages for a conversation
  socket.on("get_messages", async (data, callback) => {
    try {
      const { messages } = await OneToOneMessage.findById(
        data.conversation_id
      ).select("messages");
      callback(messages);
    } catch (error) {
      console.log(error);
    }
  });

  // listen for event => "text/link message"
  socket.on("text_message", async (data) => {
    console.log("Recived message:", data);
    
    // data: {to, from, message, conversation_id, type}
    const { message, conversation_id, from, to, type } = data;

    const to_user = await User.findById(to);
    const from_user = await User.findById(from);

    // message => {to, from, type, created_at, text, file}

    const new_message = {
      to: to,
      from: from,
      type: type,
      created_at: Date.now(),
      text: message,
    };

    // fetch OneToOneMessage Doc & push a new message to existing conversation
    const chat = await OneToOneMessage.findById(conversation_id);
    chat.messages.push(new_message);

    // save to db`
    await chat.save({ new: true, validateModifiedOnly: true });

    // emit new_message -> to user
    io.to(to_user?.socket_id).emit("new_message", {
      conversation_id,
      message: new_message,
    });

    // emit new_message -> from user
    io.to(from_user?.socket_id).emit("new_message", {
      conversation_id,
      message: new_message,
    });
  });

  // listen for event => "media message"
  socket.on("file_message", async (data) => {
    console.log("Recived Message", data)

    // data = {from, to, text, file}

    // get the file extension
    const fileExtention = path.extname(data.file.name);

    // create a unique file name
    const fileName = `${Date.now()}_${Math.floor.random() * 100000}${fileExtention}`;

    // upload the file

    // create a new conversation if it doesn't exist or add new message to message list

    // save message to database

    // emit incoming message to -> to user

    // emit outgoing message to -> from user
  })

  // disconnect
  socket.on("end", async (data) => {

    // Find user by ID and set status as offline
    if (data.user_id) {
      await User.findByIdAndUpdate(data.user_id, { status: "Offline" });
    }

    // TODO => broadcast user disconnected

    console.log("closing connection");
    socket.disconnect(0);
  });
});


process.on("unhandledRejection", (err) => {
  console.log(err);
  httpServer.close(() => {
    process.exit(1);
  }) 
});
