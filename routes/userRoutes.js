const express = require("express");
const router = express.Router();
const { viewProfile, updateUser } = require("../controllers/userController");

<<<<<<< HEAD
const { restrictTo, checkAuth, isOwner } = require("../middlewares/AuthMW");
=======
const {
  checkAuth,
  protect,
  restrictTo,
  isOwner,
} = require("../middlewares/AuthMW");
>>>>>>> eman
const validateMW = require("../middlewares/schemaValidatorMW");
const checkUniqueness = require("../middlewares/userValidatorMW");
const { updateValidator } = require("../utils/validators/userValidator");

router.get(
<<<<<<< HEAD
  "/profile",
  checkAuth,
=======
  "/profile/:id",
  protect,
>>>>>>> eman
  isOwner,
  restrictTo("seller", "buyer"),
  viewProfile,
);
router.patch(
<<<<<<< HEAD
  "/profile/update",
  checkAuth,
=======
  "/profile/update/:id",
  protect,
>>>>>>> eman
  isOwner,
  restrictTo("seller", "buyer"),
  validateMW(updateValidator),
  checkUniqueness,
  updateUser,
);

module.exports = router;
