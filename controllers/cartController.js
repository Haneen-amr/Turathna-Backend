const asyncFunction = require("../middlewares/asyncMW");
const ApiError = require("../utils/apiError");
const Cart = require("../models/cartModel");

const addToCart = asyncFunction(async (req, res, next) => {
  const buyerId = req.auth.userId;
  const { productId } = req.body;

  let buyerCart = await Cart.findOne({ buyer: buyerId });
  if (buyerCart) {
    const productIndex = buyerCart.products.findIndex(
      (item) => item.product.toString() === productId,
    );

    if (productIndex > -1) {
      // -1 => element not found (index = -1)
      buyerCart.products[productIndex].quantity += 1;
    } else {
      buyerCart.products.push({ product: productId, quantity: 1 });
    }
    await buyerCart.save();
  } else {
    buyerCart = new Cart({
      buyer: buyerId,
      products: [{ product: productId, quantity: 1 }],
    });
    await buyerCart.save();
  }
  res.status(200).json({
    message: "Product added to cart",
    data: { cart: buyerCart },
  });
});

const getCart = asyncFunction(async (req, res, next) => {
  const buyerId = req.auth.userId;
  const buyerCart = await Cart.findOne({ buyer: buyerId }).populate({
    path: "products.product",
    select: "title_ar title_en finalPrice coverImage verificationStatus",
  });
  if (!buyerCart || buyerCart.products.length === 0) {
    return res.status(200).json({
      status: "success",
      message: "The cart is empty",
      data: {
        products: [],
        totalPrice: 0,
      },
    });
  }

  // Remove products that are null (deleted) or rejected
  const removedProducts = buyerCart.products
    .filter(
      (item) =>
        item.product === null || item.product.verificationStatus === "rejected",
    )
    .map((item) => {
      return {
        id: item.product?._id || item._id,
        title_ar: item.product?.title_ar || "منتج غير متاح",
        title_en: item.product?.title_en || "Product unavailable",
      };
    });

  const validProducts = buyerCart.products.filter(
    (item) =>
      item.product !== null && item.product.verificationStatus !== "rejected",
  );

  if (validProducts.length !== buyerCart.products.length) {
    buyerCart.products = validProducts;
    await buyerCart.save();
  }

  const totalPrice = buyerCart.products.reduce((sum, item) => {
    return sum + item.product.finalPrice * item.quantity;
  }, 0);
  res.status(200).json({
    status: "success",
    data: {
      cart: buyerCart,
      totalPrice: Math.round(totalPrice),
      removedProducts,
    },
  });
});

const removeFromCart = asyncFunction(async (req, res, next) => {
  const buyerId = req.auth.userId;
  const { productId } = req.params;

  const buyerCart = await Cart.findOne({ buyer: buyerId });
  if (!buyerCart) return next(new ApiError("Cart not found", 404));

  buyerCart.products = buyerCart.products.filter(
    (item) => item.product.toString() !== productId,
  );
  await buyerCart.save();

  await buyerCart.populate({
    path: "products.product",
    select: "title_ar title_en finalPrice coverImage",
  });
  res.status(200).json({
    message: "Product removed",
    data: { cart: buyerCart },
  });
});

const clearCart = asyncFunction(async (req, res, next) => {
  const buyerId = req.auth.userId;
  const buyerCart = await Cart.findOne({ buyer: buyerId });
  if (!buyerCart) return next(new ApiError("Cart not found", 404));

  buyerCart.products = [];
  await buyerCart.save();
  res.status(200).json({
    message: "Cart cleared successfully",
    data: { cart: buyerCart },
  });
});

const decreaseQuantity = asyncFunction(async (req, res, next) => {
  const buyerId = req.auth.userId;
  const { productId } = req.params;

  const buyerCart = await Cart.findOne({ buyer: buyerId });
  if (!buyerCart) return next(new ApiError("Cart not found", 404));

  const productIndex = buyerCart.products.findIndex(
    (item) => item.product.toString() === productId,
  );

  if (productIndex > -1) {
    if (buyerCart.products[productIndex].quantity > 1) {
      buyerCart.products[productIndex].quantity -= 1;
    } else {
      buyerCart.products.splice(productIndex, 1);
    }
    await buyerCart.save();

    await buyerCart.populate({
      path: "products.product",
      select: "title_ar title_en finalPrice coverImage",
    });

    res.status(200).json({
      status: "success",
      message: "Quantity decreased successfully",
      data: { cart: buyerCart },
    });
  } else {
    return next(new ApiError("Product not found in cart", 404));
  }
});

module.exports = {
  addToCart,
  getCart,
  removeFromCart,
  clearCart,
  decreaseQuantity,
};
