const User = require("../models/User");

async function getLeaderboard(req, res) {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const list = await User.find({ bestScore: { $gt: 0 } })
      .sort({ bestScore: -1 })
      .limit(limit)
      .select("displayName username bestScore highestUnlockedLevel")
      .lean();
    const leaderboard = list.map((u) => ({
      displayName: u.displayName || u.username,
      bestScore: u.bestScore || 0,
      highestUnlockedLevel: u.highestUnlockedLevel || 1,
    }));
    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ error: err.message || "Leaderboard failed" });
  }
}

module.exports = { getLeaderboard };
