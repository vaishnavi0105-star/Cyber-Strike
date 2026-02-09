const express = require("express");
const path = require("path");
const cors = require("cors");
const routes = require("./routes");

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Determine root directory (works on both local and Vercel)
const rootDir = path.join(__dirname, "..");

// Serve static files from root directory with proper MIME types
app.use(express.static(rootDir));

// API routes
app.use("/api", routes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Serve index.html for root and any non-matching routes
app.get("/", (req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});

app.get("/leaderboard", (req, res) => {
  res.sendFile(path.join(rootDir, "leaderboard.html"));
});

// Catch-all for other routes - serve index.html for SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});

module.exports = app;
