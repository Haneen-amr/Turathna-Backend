const asyncFunction = require("../middlewares/asyncMW");
const ApiError = require("../utils/apiError");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Region = require("../models/regionModel");
const User = require("../models/userModel");
const { autoTranslate } = require("./translationController");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
  try {
    const embedding = await generateEmbedding(newProduct);
    if (embedding) {
      await Product.updateOne(
        { _id: newProduct._id },
        { $set: { embeddings: embedding } },
      );
    }
  } catch (err) {
    console.error("[addProduct] Embedding failed:", err.message);
  }

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

// ─────────────────────────────────────────────
// EMBEDDING HELPER — call this on create & update
// ─────────────────────────────────────────────
const generateEmbedding = async (product) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" }); // ← correct model name
    const result = await model.embedContent({
      content: {
        parts: [{ text: `${product.title_en} ${product.description_en}` }],
      },
      outputDimensionality: 768, // ← this only works on gemini-embedding-001, not 004
    });
    return result.embedding.values;
  } catch (err) {
    console.error("[Embedding Helper Error]:", err.message);
    return null;
  }
};

// ─────────────────────────────────────────────
// GET PRODUCT BY ID
// ─────────────────────────────────────────────
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
    // ── Try vector search first ──────────────────────────────────────────
    if (product.embeddings?.length > 0) {
      try {
        relatedProducts = await Product.aggregate([
          {
            $vectorSearch: {
              index: "products_search_index",
              path: "embeddings",
              queryVector: product.embeddings,
              numCandidates: 100,
              limit: 6, // fetch more than needed so we can filter
              filter: { verificationStatus: { $eq: "approved" } },
            },
          },
          // exclude the current product after the search
          { $match: { _id: { $ne: product._id } } },
          { $limit: 3 },
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
      } catch (err) {
        console.error("[Vector Search] Failed:", err.message);
        relatedProducts = []; // ensure fallback runs
      }
    }

    // ── Fallback: fill up to 3 with random same-category products ────────
    // Runs if: no embeddings, vector search failed, or returned < 3 results
    if (relatedProducts.length < 3) {
      const needed = 3 - relatedProducts.length;
      const excludeIds = [product._id, ...relatedProducts.map((p) => p._id)];

      try {
        const randomProducts = await Product.aggregate([
          {
            $match: {
              category: product.category._id,
              _id: { $nin: excludeIds }, // exclude current + already found
              verificationStatus: "approved",
            },
          },
          { $sample: { size: needed } },
          {
            $project: {
              title_ar: 1,
              title_en: 1,
              finalPrice: 1,
              coverImage: 1,
            },
          },
        ]);

        relatedProducts = [...relatedProducts, ...randomProducts];
      } catch (err) {
        console.error("[Random Fallback] Failed:", err.message);
      }
    }
  }

  const productObj = product.toObject();
  delete productObj.embeddings;

  res.status(200).json({
    success: true,
    data: { product: productObj, relatedProducts },
  });
});

// ─────────────────────────────────────────────
// ONE-TIME MIGRATION SCRIPT
// Run manually: node -e "require('./controllers/productController').migrateEmbeddings()"
// ─────────────────────────────────────────────
const migrateEmbeddings = asyncFunction(async (req, res, next) => {
  // Only migrate products that have English content but no embeddings yet
  const products = await Product.find({
    $or: [
      { embeddings: { $exists: false } },
      { embeddings: { $eq: [] } },
      { embeddings: null },
    ],
    title_en: { $exists: true, $ne: "" },
  });

  console.log(`[Migration] Found ${products.length} products to embed`);

  for (const prod of products) {
    const values = await generateEmbedding(prod);
    if (values) {
      await Product.updateOne(
        { _id: prod._id },
        { $set: { embeddings: values } },
      );
      console.log(`[Migration] ✓ ${prod._id}`);
    } else {
      console.log(`[Migration] ✗ Failed: ${prod._id} (Check Internet/API Key)`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  res.status(200).json({
    status: "success",
    message: `Migration completed. Updated ${products.length} products.`,
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

  // Regenerate embedding AFTER translation — uses fresh English text
  // Only if content actually changed
  if (req.body.title_ar || req.body.description_ar) {
    try {
      const current = await Product.findById(req.params.productId);
      if (current) {
        // Merge current with pending changes for embedding input
        const embeddingInput = {
          title_en: updateData.title_en || current.title_en,
          description_en: updateData.description_en || current.description_en,
        };
        const embedding = await generateEmbedding(embeddingInput);
        if (embedding) {
          updateData.embeddings = embedding; // include in the update below
        }
      }
    } catch (err) {
      console.error("[editProduct] Embedding failed:", err.message);
    }
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
  generateEmbedding,
  getProductByID,
  migrateEmbeddings,
  addProduct,
  editProduct,
  deleteProduct,
};
