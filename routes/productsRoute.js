const express = require("express");
const router = express.Router();
const {
  getAllProducts,
  getProductsByCategory,
  getProductsByRegion,
  getAllMyProducts,
  getProductByID,
  migrateEmbeddings,
  addProduct,
  editProduct,
  deleteProduct,
} = require("../controllers/productController");

const { uploadFiles, processFiles } = require("../middlewares/uploadImageMW");
const {
  protect,
  restrictTo,
  optionalAuth,
  isOwner,
} = require("../middlewares/AuthMW");
const validateMW = require("../middlewares/schemaValidatorMW");
const {
  productValidator,
  updateProductValidator,
} = require("../utils/validators/productValidator");

//router.get("/run-migration", migrateEmbeddings);

router.get("/", getAllProducts);

router.get("/category", getProductsByCategory);

router.get("/region", getProductsByRegion);

router.get("/:productId", optionalAuth, getProductByID);

router.get(
  "/seller/:id",
  protect,
  isOwner,
  restrictTo("seller"),
  getAllMyProducts,
);

const productUploads = uploadFiles("productImages", 5);
router.post(
  "/seller/:id",
  productUploads,
  processFiles("productImages"),
  protect,
  isOwner,
  restrictTo("seller"),
  validateMW(productValidator),
  addProduct,
);

router.patch(
  "/seller/:id/:productId",
  productUploads,
  processFiles("productImages"),
  protect,
  isOwner,
  restrictTo("seller"),
  validateMW(updateProductValidator),
  editProduct,
);

router.delete(
  "/seller/:id/:productId",
  protect,
  isOwner,
  restrictTo("seller"),
  deleteProduct,
);

module.exports = router;
