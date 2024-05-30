const app = require("./app");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: "./config.env" });

mongoose.set('strictQuery', false);



process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
});


const http = require("http");

const server = http.createServer(app);

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

server.listen(port, () => {
  console.log(`App is running on port ${port}`)
});


process.on("unhandledRejection", (err) => {
  console.log(err);
  server.close(() => {
    process.exit(1);
  }) 
});
