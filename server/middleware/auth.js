const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET } = require("../config");

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization" });
  }
  const token = auth.slice(7);
  let userId;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    userId = payload.userId;
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  User.findById(userId)
    .then((user) => {
      if (!user) return res.status(401).json({ error: "User not found" });
      req.user = user;
      next();
    })
    .catch(() => res.status(500).json({ error: "Database error" }));
}

module.exports = { authMiddleware };
