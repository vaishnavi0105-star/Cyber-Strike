function getProfile(req, res) {
  const u = req.user;
  res.json({
    id: u._id.toString(),
    username: u.username,
    displayName: u.displayName || u.username,
    highestUnlockedLevel: u.highestUnlockedLevel || 1,
    bestScore: u.bestScore || 0,
  });
}

async function updateProfile(req, res) {
  try {
    const u = req.user;
    const { bestScore, highestUnlockedLevel } = req.body || {};
    if (typeof bestScore === "number" && bestScore > (u.bestScore || 0)) {
      u.bestScore = bestScore;
    }
    if (typeof highestUnlockedLevel === "number" && highestUnlockedLevel >= 1 && highestUnlockedLevel <= 5) {
      u.highestUnlockedLevel = Math.max(u.highestUnlockedLevel || 1, highestUnlockedLevel);
    }
    await u.save();
    res.json({
      highestUnlockedLevel: u.highestUnlockedLevel,
      bestScore: u.bestScore,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Update failed" });
  }
}

module.exports = { getProfile, updateProfile };
