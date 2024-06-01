const app = require("./app");
const dotenv = require("dotenv");
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

  // disconnect
  socket.on("end", async (data) => {
    // Find user by ID and set status as offline

    if (data.user_id) {
      await User.findByIdAndUpdate(data.user_id, { status: "Offline" });
    }

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
