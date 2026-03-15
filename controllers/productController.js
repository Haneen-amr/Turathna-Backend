const asyncFunction = require("../middlewares/asyncMW");
const ApiError = require("../utils/apiError");
const Product = require("../models/productModel");
const {
  getNameFromSlug,
  REGIONS_INFO,
  CATEGORIES_INFO,
} = require("../utils/constants");
const User = require("../models/userModel");
const factory = require("./handlersFactory");

const getAllProducts = asyncFunction(async (req, res, next) => {
  let productsList = await Product.find({
    verificationStatus: "approved",
  }).select("-seller");

  if (productsList.length === 0) {
    return next(new ApiError("No products are available", 404));
  }
  res.status(200).json({
    status: "success",
    results: productsList.length,
    data: { productsList },
  });
});

const getProductsByCategory = asyncFunction(async (req, res, next) => {
  const filter = { verificationStatus: "approved" };
  if (req.query.category) {
    const officialName = getNameFromSlug(req.query.category, CATEGORIES_INFO);
    if (!officialName) return next(new ApiError("Invalid category", 400));
    filter.category = officialName;
  }

  const productsList = await Product.find(filter)
    .select("-seller")
    .sort("-createdAt");

  if (productsList.length === 0) {
    return next(new ApiError("No products found", 404));
  }
  res.status(200).json({
    status: "success",
    results: productsList.length,
    data: { productsList },
  });
});

const getProductsByRegion = asyncFunction(async (req, res, next) => {
  const filter = { verificationStatus: "approved" };
  if (req.query.region) {
    const officialName = getNameFromSlug(req.query.region, REGIONS_INFO);
    if (!officialName) return next(new ApiError("Invalid region", 400));
    filter.region = officialName;
  }

  const productsList = await Product.find(filter)
    .select("-seller")
    .sort("-createdAt");

  if (productsList.length === 0) {
    return next(new ApiError("No products found", 404));
  }
  res.status(200).json({
    status: "success",
    results: productsList.length,
    data: { productsList },
  });
});

const getAllMyProducts = asyncFunction(async (req, res, next) => {
  let filterObject = {}; //to return products based on sellerId
  if (req.params.id) {
    filterObject = { seller: req.params.id };
  }
  const seller = await User.findById(req.params.id).select("-password -__v");
  if (!seller || seller.role !== "seller")
    return next(new ApiError("Seller not found", 404));
  const products = await Product.find(filterObject).populate(
    "category",
    "name",
  );
  if (products.length === 0)
    return next(new ApiError("This seller has no products yet", 404));
  res.status(200).json({
    status: "success",
    results: products.length,
    data: { products },
  });
});

const addProduct = asyncFunction(async (req, res, next) => {
  const {
    title_ar,
    description_ar,
    description_video,
    descriptionType,
    price,
    coverImage,
    productImages,
    region,
  } = req.body;

  const regionInput = Array.isArray(region) ? region : [region];
  const officialRegions = regionInput.map((slug) =>
    getNameFromSlug(slug, REGIONS_INFO),
  );

  if (officialRegions.includes(undefined)) {
    return next(new ApiError("Invalid Region name", 400));
  }

  if (!description_ar && !description_video)
    return next(new ApiError("A description must be added", 404));

  if (req.body.region && !Array.isArray(req.body.region)) {
    req.body.region = [req.body.region];
  }

  const newProduct = await Product.create({
    title_ar,
    description_ar,
    description_video,
    descriptionType,
    description_en: null,
    price,
    coverImage,
    productImages: productImages,
    seller: req.params.id,
    region: officialRegions,
  });

  res.status(201).json({
    status: "success",
    message: "Product submitted & waiting for approval",
    data: newProduct,
  });
});

const getProductByID = asyncFunction(async (req, res, next) => {
  const product = await Product.findById(req.params.productId);
  if (!product) return next(new ApiError("Product not found", 404));
  res.status(200).json({
    success: true,
    data: { product },
  });
});

const editProduct = asyncFunction(async (req, res, next) => {
  let region = req.body.region;
  let regionInput;
  let officialRegions;
  if (region) {
    regionInput = Array.isArray(region) ? region : [region];
    officialRegions = regionInput.map((slug) =>
      getNameFromSlug(slug, REGIONS_INFO),
    );

    if (officialRegions.includes(undefined)) {
      return next(new ApiError("Invalid Region name", 400));
    }
  }
  if (req.body.region && !Array.isArray(req.body.region)) {
    req.body.region = [req.body.region];
  }
  req.body.region = officialRegions;

  if (req.body.category)
    return next(
      new ApiError("You are not allowed to enter a category name", 400),
    );

  const product = await Product.findOneAndUpdate(
    { _id: req.params.productId, seller: req.params.id },
    {
      ...req.body,
      verificationStatus: "pending",
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (!product) return next(new ApiError("Product not found", 404));

  res.status(200).json({
    status: "success",
    message: "Product updated and waiting for approval",
    data: { product },
  });
});

const deleteProduct = factory.delete(Product, "productId");

module.exports = {
  getAllProducts,
  getProductsByCategory,
  getProductsByRegion,
  getAllMyProducts,
  getProductByID,
  addProduct,
  editProduct,
  deleteProduct,
};
