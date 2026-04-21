const express = require("express");
const router = express.Router();

const {
  addToCart,
  getCart,
  removeFromCart,
  clearCart,
  decreaseQuantity,
} = require("../controllers/cartController");
const { protect, restrictTo } = require("../middlewares/AuthMW");

router.post("/", protect, restrictTo("buyer"), addToCart);
router.get("/", protect, restrictTo("buyer"), getCart);
router.patch(
  "/items/:productId",
  protect,
  restrictTo("buyer"),
  decreaseQuantity,
);
router.delete(
  "/items/:productId",
  protect,
  restrictTo("buyer"),
  removeFromCart,
);
router.delete("/", protect, restrictTo("buyer"), clearCart);

module.exports = router;
