const express = require("express");
const router = express.Router();

const { paymobWebhook } = require("../controllers/paymentController");
const { protect, restrictTo } = require("../middlewares/AuthMW");

router.post("/webhook", paymobWebhook);

// router.get("/callback", paymobCallback);

module.exports = router;
