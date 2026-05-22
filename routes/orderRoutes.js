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
router.get(
  "/seller/:id",
  protect,
  isOwner,
  restrictTo("seller"),
  getAllMyOrders,
);

module.exports = router;
