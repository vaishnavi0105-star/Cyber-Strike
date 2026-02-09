const mongoose = require("mongoose");

const startTime = Date.now();

/**
 * Health check API
 * GET /api/health — service status, DB, uptime
 */
function getHealth(req, res) {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? "connected" : dbState === 2 ? "connecting" : "disconnected";
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  res.status(200).json({
    ok: dbState === 1,
    service: "cyber-strike-api",
    version: "1.0.0",
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
    db: {
      status: dbStatus,
      ready: dbState === 1,
    },
  });
}

module.exports = { getHealth };
