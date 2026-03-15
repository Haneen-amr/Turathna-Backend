const express = require("express");
const router = express.Router();
const {
  getAllProducts,
  getProductsByCategory,
  getProductsByRegion,
  getAllMyProducts,
  getProductByID,
  addProduct,
  editProduct,
  deleteProduct,
} = require("../controllers/productController");

const { uploadFiles, processFiles } = require("../middlewares/uploadImageMW");
const { protect, restrictTo, isOwner } = require("../middlewares/AuthMW");
const validateMW = require("../middlewares/schemaValidatorMW");
const {
  productValidator,
  updateProductValidator,
} = require("../utils/validators/productValidator");

router.get("/", getAllProducts);

router.get("/category", getProductsByCategory);

router.get("/region", getProductsByRegion);

router.get(
  "/seller/:id",
  protect,
  isOwner,
  restrictTo("seller"),
  getAllMyProducts,
);

router.get(
  "/:productId",
  protect,
  restrictTo("buyer", "seller", "admin"),
  getProductByID,
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
