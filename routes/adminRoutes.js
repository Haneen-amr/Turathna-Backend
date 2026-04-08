const express = require("express");
const router = express.Router();

const {
  getPendingSellers,
  getSellerByID,
  updateSellerStatus,
  getPendingProducts,
  acceptProduct,
  rejectProduct,
} = require("../controllers/adminController");
const { uploadFiles, processFiles } = require("../middlewares/uploadImageMW");
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

router.patch(
  "/product/:id/approve",
  protect,
  restrictTo("admin"),
  uploadFiles("heritage_video", 1),
  processFiles("heritage_video"),
  validateMW(updateProductValidator),
  acceptProduct,
);

router.patch(
  "/product/:id/reject",
  protect,
  restrictTo("admin"),
  rejectProduct,
);

module.exports = router;
