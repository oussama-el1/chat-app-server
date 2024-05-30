const express = require("express");

const routes = require("./routes/index");

const morgan = require("morgan"); // used for provide information about requests

const rateLimit = require("express-rate-limit"); // limit the requests eg: 1000 request

const helmet = require("helmet"); // setting http headers

const mongosanitize  = require("express-mongo-sanitize");

const bodyParser = require("body-parser");

const xss = require("xss")

const cors = require("cors")



const app = express();


//

app.use(cors({
  origin: "*",
  methods: ["GET", "PATCH", "POST", "DELETE", "PUT"],
  credentials: true,
}));


app.use(express.json({ limit: "10kb"}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(helmet());



if (process.env.NODE_ENV === "dev") {
  app.use(morgan("dev"));
}


const limiter = rateLimit({
  max: 3000,
  windowMs: 60 * 60 * 1000, // 1hour
  message: "Too Many requests from the IP, Please try again ..."
})

/*
app.use(express.urlencoded({
    extended: true,
  })
);
 */


// app.use(mongosanitize());

// app.use(xss());

app.use("/pfe", limiter);

app.use(routes);





module.exports = app;