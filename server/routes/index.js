const express = require("express");
const healthRoutes = require("./healthRoutes");
const authRoutes = require("./authRoutes");
const profileRoutes = require("./profileRoutes");
const gameRoutes = require("./gameRoutes");
const leaderboardRoutes = require("./leaderboardRoutes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/game", gameRoutes);
router.use("/leaderboard", leaderboardRoutes);

module.exports = router;
