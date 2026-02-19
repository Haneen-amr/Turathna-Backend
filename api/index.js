const path = require("path");
const express = require("express");
const dotenv = require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});
const dbConnection = require("../config/database");

const app = express();
dbConnection();

const ApiError = require("../utils/apiError");

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
  res.status(200).json({
    message: "welcome back end",
  });
});

app.use((req, res) => {
  next(new ApiError(`Can't find this route: ${req.originalUrl}`, 404));
});

// Start the Server
const port = process.env.PORT || 5050;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
