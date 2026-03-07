const express = require("express");
const router = express.Router();
const { viewProfile, updateUser } = require("../controllers/userController");

const {
  checkAuth,
  protect,
  restrictTo,
  isOwner,
} = require("../middlewares/AuthMW");
const validateMW = require("../middlewares/schemaValidatorMW");
const checkUniqueness = require("../middlewares/userValidatorMW");
const { updateValidator } = require("../utils/validators/userValidator");

router.get(
  "/profile/:id",
  protect,
  isOwner,
  restrictTo("seller", "buyer"),
  viewProfile,
);
router.patch(
  "/profile/update/:id",
  protect,
  isOwner,
  restrictTo("seller", "buyer"),
  validateMW(updateValidator),
  checkUniqueness,
  updateUser,
);

module.exports = router;
