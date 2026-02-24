const express = require("express");
const router = express.Router();
const {
  buyerRegisteration,
  sellerRegisteration,
  buyerLogin,
  sellerLogin,
} = require("../controllers/authController");
const { uploadImages, processImages } = require("../middlewares/uploadImageMW");

const validateMW = require("../middlewares/schemaValidatorMW");
const {
  registerValidator,
  loginValidator,
} = require("../utils/validators/authValidator");

//Registration Route Handler:
router.post(
  "/register/buyer",
  validateMW(registerValidator, "buyer"),
  buyerRegisteration,
);

router.post(
  "/register/seller",
  uploadImages,
  processImages,
  validateMW(registerValidator, "seller"),
  sellerRegisteration,
);

router.post("/login/:role", validateMW(loginValidator), (req, res, next) => {
  if (req.params.role === "buyer") return buyerLogin(req, res, next);
  if (req.params.role === "seller") return sellerLogin(req, res, next);
});

module.exports = router;
