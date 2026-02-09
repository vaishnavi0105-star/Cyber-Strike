const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET } = require("../config");

function toUserResponse(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    displayName: user.displayName || user.username,
    highestUnlockedLevel: user.highestUnlockedLevel,
    bestScore: user.bestScore,
  };
}

async function signup(req, res) {
  try {
    const { username, password } = req.body || {};
    const name = (username || "").trim().toLowerCase();
    if (!name || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters" });
    }
    const existing = await User.findOne({ username: name });
    if (existing) {
      return res.status(409).json({ error: "Username already taken" });
    }
    const passwordHash = bcrypt.hashSync(password, 10);
    const user = await User.create({
      username: name,
      displayName: (req.body.username || "").trim() || name,
      passwordHash,
      highestUnlockedLevel: 1,
      bestScore: 0,
    });
    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: toUserResponse(user) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: "Username already taken" });
    res.status(500).json({ error: err.message || "Signup failed" });
  }
}

async function signin(req, res) {
  try {
    const { username, password } = req.body || {};
    const name = (username || "").trim().toLowerCase();
    if (!name || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    const user = await User.findOne({ username: name });
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: toUserResponse(user) });
  } catch (err) {
    res.status(500).json({ error: err.message || "Signin failed" });
  }
}

module.exports = { signup, signin };
