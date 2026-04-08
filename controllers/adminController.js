const asyncFunction = require("../middlewares/asyncMW");
const ApiError = require("../utils/apiError");
const User = require("../models/userModel");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Region = require("../models/regionModel");

//***SELLERS***
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
  res.status(200).json({
    status: "success",
    results: sellersList.length,
    data: { sellersList },
  });
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

//***PRODUCTS***
const getPendingProducts = asyncFunction(async (req, res, next) => {
  let productsList = await Product.find({
    verificationStatus: "pending",
  })
    .select(
      "_id title_ar description_ar coverImage productImages originalPrice finalPrice price verificationStatus rejectionMsg",
    )
    .populate("seller", "name phone")
    .sort({ _id: -1 });

  if (productsList.length === 0) {
    return next(new ApiError("No pending products found", 404));
  }
  res.status(200).json({
    status: "success",
    results: productsList.length,
    data: { productsList },
  });
});

const acceptProduct = asyncFunction(async (req, res, next) => {
  const body = req.body || {};
  let product = await Product.findById(req.params.id);
  if (!product) return next(new ApiError("Product not found", 404));

  const updateData = {
    ...body,
    verificationStatus: "approved",
    rejectionMsg: null,
  };

  let categoryId = product.category;
  if (body.category) {
    const categoryExists = await Category.findOne({
      slugName: body.category,
    });
    if (!categoryExists)
      return next(new ApiError("This category does not exist", 404));
    categoryId = categoryExists._id;
  }
  if (!categoryId) {
    return next(new ApiError("Product must belong to a category", 400));
  }
  updateData.category = categoryId;

  if (body.region) {
    regionExists = await Region.findOne({ slugName: body.region });
    if (!regionExists)
      return next(new ApiError("This region does not exist", 404));
    updateData.region = regionExists._id;
  }

  const hasExistingHeritage = product.heritage_text || product.heritage_video;
  const hasNewHeritage = body.heritage_text || body.heritage_video;

  if (!hasExistingHeritage && !hasNewHeritage) {
    return next(
      new ApiError("A heritage must be defined for the product", 400),
    );
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      returnDocument: "after",
      runValidators: true,
    },
  ).populate([
    {
      path: "region",
      select: "slugName",
    },
    { path: "category", select: "slugName" },
  ]);

  res.status(200).json({
    status: "success",
    message: "Product's status updated successfully.",
    data: { product: updatedProduct },
  });
});

const rejectProduct = asyncFunction(async (req, res, next) => {
  if (!req.body.rejectionMsg)
    return next(new ApiError("A Rejection Reason must be clarified"));
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    {
      verificationStatus: "rejected",
      rejectionMsg: req.body.rejectionMsg,
    },
    { returnDocument: "after" },
  ).populate([
    {
      path: "region",
      select: "slugName",
    },
    { path: "category", select: "slugName" },
  ]);
  if (!product) return next(new ApiError("Product not found", 404));
  res.status(200).json({
    status: "success",
    message: "Product is Rejected!",
    data: { product },
  });
});

module.exports = {
  getPendingSellers,
  getSellerByID,
  updateSellerStatus,
  getPendingProducts,
  acceptProduct,
  rejectProduct,
};
