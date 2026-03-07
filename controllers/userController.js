const asyncFunction = require("../middlewares/asyncMW");
const ApiError = require("../utils/apiError");
const User = require("../models/userModel");
const filterObj = require("../utils/filterObj");

const viewProfile = asyncFunction(async (req, res, next) => {
  const user = await User.findById(req.params.id).select("-password -__v");
  if (!user) return next(new ApiError("User not found", 404));
  res.status(200).json({
    success: true,
    user,
  });
});

let updateUser = asyncFunction(async (req, res, next) => {
  let allowedFields = [];
  if (req.auth.role === "seller") {
    allowedFields.push(
      "name",
      "phone",
      "sellingOffline",
      "sellingOnline",
      "shopAddress",
      "websiteLink",
    );
  } else if (req.auth.role === "buyer" || req.auth.role === "admin") {
    allowedFields.push("firstname", "lastname", "email", "phone", "addresses");
  }
  const filteredBody = filterObj(req.body, ...allowedFields);

  const user = await User.findByIdAndUpdate(req.params.id, filteredBody, {
    returnDocument: "after",
    runValidators: true,
    context: "query", //fot (this.) inside schema
  });

  if (!user) return next(new ApiError("User not found", 404));

  res.status(200).json({
    status: "success",
    message: "Profile updated successfully",
    data: { user },
  });
});

module.exports = {
  viewProfile,
  updateUser,
};
