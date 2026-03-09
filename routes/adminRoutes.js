const express = require("express");
const router = express.Router();

const {
  getPendingSellers,
  getSellerByID,
  updateSellerStatus,
} = require("../controllers/adminController");
const { protect, restrictTo } = require("../middlewares/AuthMW");
const validateMW = require("../middlewares/schemaValidatorMW");
const { updateValidator } = require("../utils/validators/userValidator");

router.get("/seller/pending", protect, restrictTo("admin"), getPendingSellers);

router.get("/seller/:id", protect, restrictTo("admin"), getSellerByID);

router.patch(
  "/update/seller/:id",
  protect,
  restrictTo("admin"),
  validateMW(updateValidator),
  updateSellerStatus,
);

module.exports = router;
