const mongoose = require("mongoose");

console.log("DB URI is:", process.env.DB_URI);

const dbConnection = () => {
  mongoose
    .connect(process.env.DB_URI)
    .then((conn) => {
      console.log(`Database Connected: ${conn.connection.host}`);
    })
    .catch((error) => {
      console.error("Database Error: ", error);
      process.exit(1);
    });
};

module.exports = dbConnection;
