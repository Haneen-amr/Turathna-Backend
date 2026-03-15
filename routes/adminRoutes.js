const express = require("express");
const router = express.Router();

const {
  getPendingSellers,
  getSellerByID,
  updateSellerStatus,
  getPendingProducts,
  getProductByID,
  updateProductStatus,
} = require("../controllers/adminController");
const { protect, restrictTo } = require("../middlewares/AuthMW");
const validateMW = require("../middlewares/schemaValidatorMW");
const { updateValidator } = require("../utils/validators/userValidator");
const {
  updateProductValidator,
} = require("../utils/validators/productValidator");

router.get("/seller/pending", protect, restrictTo("admin"), getPendingSellers);

router.get("/seller/:id", protect, restrictTo("admin"), getSellerByID);

router.patch(
  "/update/seller/:id",
  protect,
  restrictTo("admin"),
  validateMW(updateValidator),
  updateSellerStatus,
);

router.get(
  "/product/pending",
  protect,
  restrictTo("admin"),
  getPendingProducts,
);

router.get("/product/:id", protect, restrictTo("admin"), getProductByID);

router.patch(
  "/update/product/:id",
  protect,
  restrictTo("admin"),
  validateMW(updateProductValidator),
  updateProductStatus,
);

module.exports = router;
