async function recordGame(req, res) {
  try {
    const u = req.user;
    const { score, levelCleared, level } = req.body || {};
    const lvl = Math.max(1, Math.min(Number(level) || 1, 5));
    if (typeof score === "number" && score > (u.bestScore || 0)) {
      u.bestScore = score;
    }
    if (levelCleared === true && lvl < 5) {
      const nextLevel = lvl + 1;
      u.highestUnlockedLevel = Math.max(u.highestUnlockedLevel || 1, nextLevel);
    }
    await u.save();
    res.json({
      highestUnlockedLevel: u.highestUnlockedLevel,
      bestScore: u.bestScore,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Record failed" });
  }
}

module.exports = { recordGame };
