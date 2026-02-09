const express = require("express");
const path = require("path");
const cors = require("cors");
const routes = require("./routes");

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Serve static files from root directory FIRST
app.use(express.static(path.join(__dirname, "..")));

// API routes
app.use("/api", routes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Handle SPA routing - only serve index.html for actual page navigation
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.get("/leaderboard", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "leaderboard.html"));
});

module.exports = app;
