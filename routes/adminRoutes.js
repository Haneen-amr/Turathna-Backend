const express = require("express");
const router = express.Router();

const {
  getPendingSellers,
  getSellerByID,
  updateSellerStatus,
  getPendingProducts,
  acceptProduct,
  rejectProduct,
  getPendingWorkshops,
  acceptWorkshop,
  rejectWorkshop,
} = require("../controllers/adminController");
const { uploadFiles, processFiles } = require("../middlewares/uploadImageMW");
const { protect, restrictTo } = require("../middlewares/AuthMW");
const validateMW = require("../middlewares/schemaValidatorMW");
const { updateValidator } = require("../utils/validators/userValidator");
const {
  updateProductValidator,
} = require("../utils/validators/productValidator");
const {
  updateWorkshopValidator,
} = require("../utils/validators/workshopValidator");

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
  "/product/:productId/approve",
  protect,
  restrictTo("admin"),
  uploadFiles("heritage_video", 1),
  processFiles("heritage_video"),
  validateMW(updateProductValidator),
  acceptProduct,
);

router.patch(
  "/product/:productId/reject",
  protect,
  restrictTo("admin"),
  rejectProduct,
);

router.get(
  "/workshop/pending",
  protect,
  restrictTo("admin"),
  getPendingWorkshops,
);

router.patch(
  "/workshop/:workshopId/approve",
  protect,
  restrictTo("admin"),
  validateMW(updateWorkshopValidator),
  acceptWorkshop,
);

router.patch(
  "/workshop/:workshopId/reject",
  protect,
  restrictTo("admin"),
  rejectWorkshop,
);

module.exports = router;
