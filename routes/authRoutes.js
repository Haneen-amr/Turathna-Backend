const express = require("express");
const router = express.Router();
const {
  buyerRegisteration,
  sellerRegisteration,
  buyerLogin,
  sellerLogin,
} = require("../controllers/authController");
const { uploadFiles, processFiles } = require("../middlewares/uploadImageMW");

const validateMW = require("../middlewares/schemaValidatorMW");
const {
  registerValidator,
  loginValidator,
} = require("../utils/validators/authValidator");

//Registration Route Handler:
router.post(
  "/register/buyer",
  validateMW(registerValidator, { role: "buyer" }),
  buyerRegisteration,
);

router.post(
  "/register/seller",
  uploadFiles("uploadedPhotos", 5),
  processFiles("uploadedPhotos"),
  validateMW(registerValidator, { role: "seller" }),
  sellerRegisteration,
);

router.post(
  "/login/buyer",
  validateMW(loginValidator, { role: "buyer" }),
  buyerLogin,
);
router.post(
  "/login/seller",
  validateMW(loginValidator, { role: "seller" }),
  sellerLogin,
);

module.exports = router;
