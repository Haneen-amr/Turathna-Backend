const asyncFunction = require("../middlewares/asyncMW");
const ApiError = require("../utils/apiError");
const User = require("../models/userModel");
const Product = require("../models/productModel");
const {
  getNameFromSlug,
  CATEGORIES_INFO,
  REGIONS_INFO,
} = require("../utils/constants");
const { autoTranslate } = require("./translationController");

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

const getPendingProducts = asyncFunction(async (req, res, next) => {
  let productsList = await Product.find({
    verificationStatus: "pending",
  })
    .select("_id title_ar description_ar price verificationStatus")
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

const getProductByID = asyncFunction(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new ApiError("Product not found", 404));
  res.status(200).json({
    success: true,
    product,
  });
});

const updateProductStatus = asyncFunction(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new ApiError("Product not found", 404));

  const {
    verificationStatus,
    rejectionMsg,
    title_ar,
    title_en,
    description_ar,
    description_en,
    price,
    region,
    category,
  } = req.body;

  let officialCategory = product.category; // Default to existing
  if (category) {
    officialCategory = getNameFromSlug(category, CATEGORIES_INFO);
  }

  let officialRegions = product.region; // Default to existing
  if (region) {
    const regionInput = Array.isArray(region) ? region : [region];
    officialRegions = regionInput.map((slug) =>
      getNameFromSlug(slug, REGIONS_INFO),
    );
  }

  if (!officialCategory || officialRegions.includes(undefined)) {
    return next(new ApiError("Invalid Category or Region name", 400));
  }

  const updateData = {
    verificationStatus,
    rejectionMsg,
    title_ar,
    description_ar,
    price,
    region: officialRegions,
    regionDescription: officialRegions.map((reg) => REGIONS_INFO[reg]),
    category: officialCategory,
    categoryDescription: CATEGORIES_INFO[officialCategory],
  };

  if (verificationStatus === "rejected") updateData.rejectionMsg = rejectionMsg;

  if (verificationStatus === "approved") {
    updateData.rejectionMsg = null;

    try {
      const [translatedTitle, translatedDesc] = await Promise.all([
        title_en
          ? Promise.resolve(title_en)
          : autoTranslate(title_ar || product.title_ar, "en", "ar"),
        description_en
          ? Promise.resolve(description_en)
          : autoTranslate(description_ar || product.description_ar, "en", "ar"),
      ]);
      updateData.title_en = translatedTitle;
      updateData.description_en = translatedDesc;
    } catch (err) {
      return next(new ApiError(`Translation failed: ${err.message}`, 500));
    }
  }

  if (verificationStatus !== "approved") {
    if (title_en) updateData.title_en = title_en;
    if (description_en) updateData.description_en = description_en;
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    updateData,
    { returnDocument: "after", runValidators: true },
  );

  res.status(200).json({
    status: "success",
    message: "Product's status updated successfully.",
    data: { product: updatedProduct },
  });
});

module.exports = {
  getPendingSellers,
  getSellerByID,
  updateSellerStatus,
  getPendingProducts,
  getProductByID,
  updateProductStatus,
};
