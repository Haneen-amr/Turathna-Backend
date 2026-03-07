const express = require("express");
const router = express.Router();
const { viewProfile, updateUser } = require("../controllers/userController");

const { restrictTo, checkAuth, isOwner } = require("../middlewares/AuthMW");
const validateMW = require("../middlewares/schemaValidatorMW");
const checkUniqueness = require("../middlewares/userValidatorMW");
const { updateValidator } = require("../utils/validators/userValidator");

router.get(
  "/profile",
  checkAuth,
  isOwner,
  restrictTo("seller", "buyer"),
  viewProfile,
);
router.patch(
  "/profile/update",
  checkAuth,
  isOwner,
  restrictTo("seller", "buyer"),
  validateMW(updateValidator),
  checkUniqueness,
  updateUser,
);

module.exports = router;
