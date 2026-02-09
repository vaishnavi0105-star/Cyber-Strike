/**
 * Cyber Strike API — entry point
 * Connects to MongoDB, then starts Express app
 */
require("dotenv").config();
const app = require("./app");
const config = require("./config");
const { connectDB } = require("./config/database");

connectDB()
  .then(() => {
    console.log("MongoDB connected");
    app.listen(config.PORT, () => {
      console.log("Cyber Strike API running at http://localhost:" + config.PORT);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
