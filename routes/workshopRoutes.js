const express = require("express");
const router = express.Router();
const {
  getAllWorkshops,
  getWorkshopByID,
  getAllMyWorkshops,
  addWorkshop,
  deleteWorkshop,
} = require("../controllers/workshopController");

const { uploadFiles, processFiles } = require("../middlewares/uploadImageMW");
const {
  protect,
  restrictTo,
  optionalAuth,
  isOwner,
} = require("../middlewares/AuthMW");
const validateMW = require("../middlewares/schemaValidatorMW");
const {
  workshopValidator,
  updateWorkshopValidator,
} = require("../utils/validators/workshopValidator");

router.get("/", getAllWorkshops);

router.get("/:workshopId", optionalAuth, getWorkshopByID);

router.get(
  "/seller/:id",
  protect,
  isOwner,
  restrictTo("seller"),
  getAllMyWorkshops,
);

const productUploads = uploadFiles("workshopImages", 5);
router.post(
  "/seller/:id",
  productUploads,
  processFiles("workshopImages"),
  protect,
  isOwner,
  restrictTo("seller"),
  validateMW(workshopValidator),
  addWorkshop,
);

router.delete(
  "/seller/:id/:workshopId",
  protect,
  isOwner,
  restrictTo("seller"),
  deleteWorkshop,
);

module.exports = router;
