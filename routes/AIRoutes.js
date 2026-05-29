const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const chatLimiter = rateLimit({ windowMs: 60_000, max: 10 });

const { protect } = require("../middlewares/AuthMW");

// router.get("/", handleUserChat);

const { chat, getStatus } = require("../controllers/chatBotController");
router.post("/", protect, chatLimiter, chat);
router.get("/chatbot/status", getStatus); // optional health check

module.exports = router;
