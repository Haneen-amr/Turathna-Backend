const asyncFunction = require("../middlewares/asyncMW");
const ApiError = require("../utils/apiError");
const User = require("../models/userModel");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Region = require("../models/regionModel");
const Workshop = require("../models/workshopModel");
const Order = require("../models/orderModel");
const { autoTranslate } = require("./translationController");

//***SELLERS***
const getPendingSellers = asyncFunction(async (req, res, next) => {
  let sellersList = await User.find({
    role: "seller",
    verificationStatus: "pending",
  })
    .select("_id name phone verificationStatus")
    .sort("-createdAt");

  if (sellersList.length === 0) {
    return res.status(200).json({
      status: "success",
      message: "No pending workshops found",
      data: { sellers: [] },
    });
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
      "_id title_ar description_ar coverImage productImages originalPrice finalPrice verificationStatus rejectionMsg",
    )
    .populate("seller", "name phone")
    .sort("-createdAt");

  if (productsList.length === 0) {
    return res.status(200).json({
      status: "success",
      message: "No pending products found",
      data: { products: [] },
    });
  }
  res.status(200).json({
    status: "success",
    results: productsList.length,
    data: { productsList },
  });
});

const acceptProduct = asyncFunction(async (req, res, next) => {
  const body = req.body || {};
  const product = await Product.findById(req.params.productId);
  if (!product) return next(new ApiError("Product not found", 404));

  const { productImages, ...scalarBody } = body;

  const pendingData = product.pendingUpdate
    ? product.pendingUpdate.toObject()
    : {};

  const updateData = {
    ...product.toObject(),
    ...pendingData,
    ...scalarBody,
    verificationStatus: "approved",
    rejectionMsg: null,
  };

  if (productImages && productImages.length > 0) {
    updateData.productImages = productImages;
  } else if (pendingData.productImages?.length > 0) {
    updateData.productImages = pendingData.productImages;
  } else {
    updateData.productImages = product.productImages ?? []; // fall back to original
  }

  const originalPrice = req.body.originalPrice || pendingData.originalPrice;
  if (originalPrice) {
    const percentage = 0.1;
    updateData.originalPrice = originalPrice;
    updateData.finalPrice = Math.round(originalPrice * (1 + percentage));
  }

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
    const regionExists = await Region.findOne({ slugName: body.region });
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

  const { title_ar, description_ar } = updateData;
  const adminProvidedTitleEn = !!scalarBody.title_en;
  const adminProvidedDescEn = !!scalarBody.description_en;

  try {
    const translationPromises = [];
    if (title_ar && !adminProvidedTitleEn) {
      translationPromises.push(
        autoTranslate(title_ar, "en", "ar").then(
          (res) => (updateData.title_en = res),
        ),
      );
    }
    if (description_ar && !adminProvidedDescEn) {
      translationPromises.push(
        autoTranslate(description_ar, "en", "ar").then(
          (res) => (updateData.description_en = res),
        ),
      );
    }

    if (translationPromises.length > 0) {
      await Promise.all(translationPromises);
    }
  } catch (err) {
    return next(new ApiError(`Translation failed: ${err.message}`, 500));
  }

  delete updateData.pendingUpdate;

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.productId,
    {
      $set: updateData,
      $unset: { pendingUpdate: "" },
    },
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
    message: "Product is Approved.",
    data: { product: updatedProduct },
  });
});

const rejectProduct = asyncFunction(async (req, res, next) => {
  if (!req.body.rejectionMsg)
    return next(new ApiError("A Rejection Reason must be clarified"));
  const product = await Product.findByIdAndUpdate(
    req.params.productId,
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

//***WORKSHOPS***
const getPendingWorkshops = asyncFunction(async (req, res, next) => {
  let workshopsList = await Workshop.find({
    verificationStatus: "pending",
  })
    .select(
      "_id title_ar description_ar coverImage workshopImages originalPrice finalPrice verificationStatus rejectionMsg",
    )
    .populate("seller", "name phone")
    .sort("-createdAt");

  if (workshopsList.length === 0) {
    return res.status(200).json({
      status: "success",
      message: "No pending workshops found",
      data: { workshops: [] },
    });
  }
  res.status(200).json({
    status: "success",
    results: workshopsList.length,
    data: { workshopsList },
  });
});

const acceptWorkshop = asyncFunction(async (req, res, next) => {
  const body = req.body || {};
  let workshop = await Workshop.findById(req.params.workshopId);
  if (!workshop) return next(new ApiError("Workshop not found", 404));

  const updateData = {
    ...body,
    verificationStatus: "approved",
    rejectionMsg: null,
  };

  if (body.originalPrice) {
    const percentage = 0.2;
    updateData.finalPrice = body.originalPrice * (1 + percentage);
  }

  const { title_ar, description_ar } = updateData;
  const { title_en, description_en } = updateData;

  try {
    const translationPromises = [];
    if (title_ar && !title_en) {
      translationPromises.push(
        autoTranslate(title_ar, "en", "ar").then(
          (res) => (updateData.title_en = res),
        ),
      );
    }
    if (description_ar && !description_en) {
      translationPromises.push(
        autoTranslate(description_ar, "en", "ar").then(
          (res) => (updateData.description_en = res),
        ),
      );
    }

    if (translationPromises.length > 0) {
      await Promise.all(translationPromises);
    }
  } catch (err) {
    return next(new ApiError(`Translation failed: ${err.message}`, 500));
  }

  const updatedWorkshop = await Workshop.findByIdAndUpdate(
    req.params.workshopId,
    updateData,
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  res.status(200).json({
    status: "success",
    message: "Workshop is Approved.",
    data: { workshop: updatedWorkshop },
  });
});

const rejectWorkshop = asyncFunction(async (req, res, next) => {
  if (!req.body.rejectionMsg)
    return next(new ApiError("A Rejection Reason must be clarified"));
  const workshop = await Workshop.findByIdAndUpdate(
    req.params.workshopId,
    {
      verificationStatus: "rejected",
      rejectionMsg: req.body.rejectionMsg,
    },
    { returnDocument: "after" },
  );
  if (!workshop) return next(new ApiError("Workshop not found", 404));
  res.status(200).json({
    status: "success",
    message: "Workshop is Rejected!",
    data: { workshop },
  });
});

const getAllOrders = asyncFunction(async (req, res, next) => {
  const orders = await Order.find({
    shippingStatus: { $in: ["pending", "out for delivery"] },
    $or: [{ isPaid: true }, { paymentMethod: "cash" }],
  })
    .populate({
      path: "orderItems.product",
      select: "title_ar title_en finalPrice coverImage seller",
      populate: {
        path: "seller",
        select: "name phone",
      },
    })
    .select(
      "buyer addressDetails.first_name addressDetails.last_name addressDetails.phone_number addressDetails.street addressDetails.city orderItems.quantity orderStatus shippingStatus isPaid createdAt",
    )
    .sort("-createdAt")
    .lean();

  const ordersList = orders.map((order) => {
    return {
      ...order,
      orderDate: order.createdAt
        ? order.createdAt.toISOString().split("T")[0]
        : null,
    };
  });

  res.status(200).json({
    status: "success",
    results: ordersList.length,
    data: { ordersList },
  });
});

const editShippingStatus = asyncFunction(async (req, res, next) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const order = await Order.findById(orderId)
    .populate({
      path: "orderItems.product",
      select: "title_ar title_en finalPrice coverImage seller",
      populate: {
        path: "seller",
        select: "name phone",
      },
    })
    .select(
      "user addressDetails.first_name addressDetails.last_name addressDetails.phone_number orderItems.quantity orderStatus shippingStatus paymentMethod isPaid createdAt",
    );
  if (!order) return next(new ApiError("Order not found", 404));

  if (order.orderStatus !== "finished")
    return next(
      new ApiError(
        "Shipping status can't be updated unless the order is 'finished'",
        400,
      ),
    );

  order.shippingStatus = status;

  if (status == "delivered") {
    order.deliveredAt = Date.now();
    if (order.paymentMethod == "cash") {
      order.isPaid = true;
      order.paidAt = Date.now();
    }
  }

  await order.save();

  res.status(200).json({
    status: "success",
    message: "Shipping status updated successfully!",
    data: { order },
  });
});

module.exports = {
  getPendingSellers,
  getSellerByID,
  updateSellerStatus,
  getPendingProducts,
  acceptProduct,
  rejectProduct,
  getPendingWorkshops,
  acceptWorkshop,
  rejectWorkshop,
  getAllOrders,
  editShippingStatus,
};
