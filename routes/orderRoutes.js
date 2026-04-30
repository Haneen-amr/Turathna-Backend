const express = require("express");
const router = express.Router();

const {
  checkout,
  checkoutResponse,
  getAllMyOrders,
} = require("../controllers/orderController");

const { protect, restrictTo, isOwner } = require("../middlewares/AuthMW");

router.post("/checkout", protect, checkout);
router.get("/checkout", checkoutResponse);
router.get("/seller/:sellerId", protect, restrictTo("seller"), getAllMyOrders);

module.exports = router;
