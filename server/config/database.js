const mongoose = require("mongoose");
const { MONGODB_URI } = require("./index");

function connectDB() {
  return mongoose.connect(MONGODB_URI);
}

module.exports = { connectDB };
