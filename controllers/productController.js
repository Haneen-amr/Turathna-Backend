const asyncFunction = require("../middlewares/asyncMW");
const ApiError = require("../utils/apiError");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Region = require("../models/regionModel");
const User = require("../models/userModel");
const { autoTranslate } = require("./translationController");

const getAllProducts = asyncFunction(async (req, res, next) => {
  let productsList = await Product.find({
    verificationStatus: "approved",
  })
    .select(
      "title_ar title_en description_ar description_en finalPrice coverImage productImages",
    )
    .sort("-createdAt");

  if (productsList.length === 0) {
    return res.status(200).json({
      status: "success",
      message: "No products found",
      data: { products: [] },
    });
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
    const categoryExists = await Category.findOne({
      slugName: req.query.category,
    });
    if (!categoryExists) {
      return next(new ApiError("This category does not exist", 404));
    }
    filter.category = categoryExists._id;
  }

  const productsList = await Product.find(filter)
    .select(
      "title_ar title_en description_ar description_en finalPrice coverImage productImages",
    )
    .sort("-createdAt");

  if (productsList.length === 0) {
    return res.status(200).json({
      status: "success",
      message: "No products found",
      data: { products: [] },
    });
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
    const regionExists = await Region.findOne({
      slugName: req.query.region,
    });
    if (!regionExists) {
      return next(new ApiError("This region does not exist", 404));
    }
    filter.region = regionExists._id;
  }

  const productsList = await Product.find(filter)
    .select(
      "title_ar title_en description_ar description_en finalPrice coverImage productImages",
    )
    .sort("-createdAt");

  if (productsList.length === 0) {
    return res.status(200).json({
      status: "success",
      message: "No products found",
      data: { products: [] },
    });
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
  const products = await Product.find(filterObject)
    .select(
      "title_ar description_ar coverImage productImages originalPrice verificationStatus rejectionMsg",
    )
    .sort("-createdAt");
  if (products.length === 0) {
    return res.status(200).json({
      status: "success",
      message: "No products found",
      data: { products: [] },
    });
  }

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
    originalPrice,
    coverImage,
    productImages,
    region,
  } = req.body;

  if (!description_ar)
    return next(
      new ApiError("A description must be added for the product", 404),
    );

  let regionId = region;
  const regionExists = await Region.findOne({ slugName: req.body.region });
  if (!regionExists)
    return next(new ApiError("This region does not exist", 404));
  regionId = regionExists._id;

  const percentage = 0.1;
  const finalPrice = originalPrice * (1 + percentage);

  let title_en = null;
  let description_en = null;
  try {
    const [translatedTitle, translatedDesc] = await Promise.all([
      title_en
        ? Promise.resolve(title_en)
        : autoTranslate(title_ar || title_ar, "en", "ar"),
      description_en
        ? Promise.resolve(description_en)
        : autoTranslate(description_ar || description_ar, "en", "ar"),
    ]);
    title_en = translatedTitle;
    description_en = translatedDesc;
  } catch (err) {
    return next(new ApiError(`Translation failed: ${err.message}`, 500));
  }

  const newProduct = await Product.create({
    title_ar,
    title_en,
    description_ar,
    description_en,
    heritage_text: null,
    heritage_video: null,
    heritageType: null,
    originalPrice,
    finalPrice,
    coverImage,
    productImages,
    seller: req.params.id,
    region: regionId,
    category: null,
  });

  let result = await Product.findById(newProduct._id).populate(
    "region",
    "slugName",
  );
  result = result.toObject();
  delete result.finalPrice;

  res.status(201).json({
    status: "success",
    message: "Product submitted & waiting for approval",
    data: result,
  });
});

const getProductByID = asyncFunction(async (req, res, next) => {
  const { productId } = req.params;
  let query;

  if (req.auth?.role === "seller") {
    query = Product.findById(productId).select(
      "-title_en -description_en -finalPrice -category -heritage_text -heritage_video -heritageType",
    );
  } else if (req.auth?.role === "admin") {
    query = Product.findById(productId).populate(
      "pendingUpdate.region",
      "slugName",
    );
  } else {
    query = Product.findOne({
      _id: productId,
      verificationStatus: "approved",
    }).select("-seller -verificationStatus -rejectionMsg -originalPrice");
  }

  const product = await query.populate([
    { path: "region", select: "slugName" },
    { path: "category", select: "slugName" },
  ]);

  if (!product) return next(new ApiError("Product not found", 404));

  let relatedProducts = [];
  if (req.auth?.role !== "seller" && req.auth?.role !== "admin") {
    relatedProducts = await Product.aggregate([
      {
        $match: {
          category: product.category._id,
          _id: { $ne: product._id },
          verificationStatus: "approved",
        },
      },
      {
        $sample: { size: 3 },
      },
      {
        $project: {
          title_ar: 1,
          title_en: 1,
          description_ar: 1,
          description_en: 1,
          finalPrice: 1,
          coverImage: 1,
          productImages: 1,
        },
      },
    ]);
  }

  res.status(200).json({
    success: true,
    data: { product, relatedProducts },
  });
});

const editProduct = asyncFunction(async (req, res, next) => {
  const updateData = { ...req.body };
  if (req.body.category)
    return next(
      new ApiError("Seller is not allowed to change product's category"),
    );

  const regionExists = await Region.findOne({ slugName: req.body.region });
  if (!regionExists)
    return next(new ApiError("This region does not exist", 404));
  updateData.region = regionExists._id;

  if (req.body.originalPrice) {
    const percentage = 0.1;
    updateData.finalPrice = req.body.originalPrice * (1 + percentage);
  }

  try {
    const translationPromises = [];
    if (updateData.title_ar && !updateData.title_en) {
      translationPromises.push(
        autoTranslate(updateData.title_ar, "en", "ar").then(
          (res) => (updateData.title_en = res),
        ),
      );
    }
    if (updateData.description_ar && !updateData.description_en) {
      translationPromises.push(
        autoTranslate(updateData.description_ar, "en", "ar").then(
          (res) => (updateData.description_en = res),
        ),
      );
    }
    await Promise.all(translationPromises);
  } catch (err) {
    return next(new ApiError(`Translation failed: ${err.message}`, 500));
  }

  const imageFields = ["productImages"];
  imageFields.forEach((field) => {
    if (Array.isArray(updateData[field]) && updateData[field].length === 0) {
      delete updateData[field];
    }
  });

  const product = await Product.findOneAndUpdate(
    { _id: req.params.productId, seller: req.params.id },
    {
      $set: {
        pendingUpdate: updateData,
        verificationStatus: "pending",
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  )
    .populate("region", "slugName")
    .populate("pendingUpdate.region", "slugName");

  if (!product) return next(new ApiError("Product not found", 404));

  const productObj = product.toObject();

  delete productObj.finalPrice;
  delete productObj.heritage_text;
  delete productObj.heritage_video;
  delete productObj.heritageType;
  delete productObj.category;

  res.status(200).json({
    status: "success",
    message: "Product updated and waiting for approval",
    data: productObj,
  });
});

const deleteProduct = asyncFunction(async (req, res, next) => {
  const { id, productId } = req.params;
  const product = await Product.findOneAndDelete({
    _id: productId,
    seller: id,
  });
  if (!product) {
    return next(
      new ApiError("Product not found or you don't have permission", 404),
    );
  }
  res.status(200).json({
    success: true,
    message: "Product deleted successfully",
  });
});

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
