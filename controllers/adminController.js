const asyncFunction = require("../middlewares/asyncMW");
const ApiError = require("../utils/apiError");
const User = require("../models/userModel");
const filterObj = require("../utils/filterObj");

const getPendingSellers = asyncFunction(async (req, res, next) => {
  let sellersList = await User.find({
    role: "seller",
    verificationStatus: "pending",
  })
    .select("_id name phone verificationStatus")
    .sort({ _id: -1 });

  if (sellersList.length === 0) {
    return next(new ApiError("No pending sellers found", 404));
  }
  res.json(sellersList);
});

const getSellerByID = asyncFunction(async (req, res, next) => {
  const seller = await User.findById(req.params.id).select("-password -__v");
  if (!seller || seller.role !== "seller")
    return next(new ApiError("Seller not found", 404));
  res.status(200).json({
    success: true,
    seller,
  });
});

const updateSellerStatus = asyncFunction(async (req, res, next) => {
  const { verificationStatus } = req.body;
  let seller = await User.findByIdAndUpdate(
    req.params.id,
    { verificationStatus },
    { returnDocument: "after", runValidators: true },
  );

  if (!seller || seller.role !== "seller")
    return next(new ApiError("Seller not found", 404));
  res.status(200).json({
    status: "success",
    message: "Seller's status updated successfully",
    data: { seller },
  });
});

module.exports = {
  getPendingSellers,
  getSellerByID,
  updateSellerStatus,
};
