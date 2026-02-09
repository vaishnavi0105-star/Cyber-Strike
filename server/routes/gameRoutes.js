const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { recordGame } = require("../controllers/gameController");

const router = express.Router();

router.post("/record", authMiddleware, recordGame);

module.exports = router;
