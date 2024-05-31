const app = require("./app");
const dotenv = require("dotenv");
const mongoose = require("mongoose");


mongoose.set('strictQuery', false);



dotenv.config({ path: "./config.env" });


process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
});


const { server, Server } = require("socket.io");

const http = require("http");

const httpServer = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
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


io.on("connection", async (socket) => {

  //console.log(socket);

  const user_id = socket.handshake.query["user_id"];
  const socket_id = socket.id;

  console.log(`user with id ${user_id} connected with socket id ${socket_id}`);

  if (user_id) {
    await User.findByIdAndUpdate(user_id, { socket_id });
  }
});



// socket event listeners

/* 

socket.on("friend_request", async (data) => {

  console.log(data.to);

  const to = await User.findOne({ _id: data.to }); // find the user who sent the request

  // TODO => create a new friend request

  // emit to the user who sent the request
  io.to(to.socket_id).emit("new_friend_request", {

  } );

}); 


*/




process.on("unhandledRejection", (err) => {
  console.log(err);
  httpServer.close(() => {
    process.exit(1);
  }) 
});
