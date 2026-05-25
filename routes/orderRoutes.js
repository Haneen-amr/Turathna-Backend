const express = require("express");
const router = express.Router();

const {
  checkout,
  checkoutResponse,
  getMyOrders,
  getAllMyOrders,
  editOrderStatus,
} = require("../controllers/orderController");

const { protect, restrictTo, isOwner } = require("../middlewares/AuthMW");

router.post("/checkout", protect, restrictTo("buyer"), checkout);
router.get("/checkout", protect, restrictTo("buyer"), checkoutResponse);

router.get("/buyer/:id", protect, restrictTo("buyer"), getMyOrders);

router.get("/seller/:id", protect, restrictTo("seller"), getAllMyOrders);

router.patch(
  "/:orderId/product/:productId",
  protect,
  restrictTo("seller"),
  editOrderStatus,
);

module.exports = router;
