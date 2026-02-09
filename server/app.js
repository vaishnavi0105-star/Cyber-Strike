const express = require("express");
const path = require("path");
const cors = require("cors");
const routes = require("./routes");

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// API routes
app.use("/api", routes);

// Serve static files from root directory
app.use(express.static(path.join(__dirname, "..")));

// Handle SPA routing - serve index.html for all non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

module.exports = app;
