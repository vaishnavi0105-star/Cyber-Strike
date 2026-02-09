const express = require("express");
const cors = require("cors");
const routes = require("./routes");

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// API routes
app.use("/api", routes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = app;
