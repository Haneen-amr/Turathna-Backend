const asyncFunction = require("../middlewares/asyncMW");
const User = require("../models/userModel");
const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const Product = require("../models/productModel");
const paymentService = require("../services/paymobService");
const ApiError = require("../utils/apiError");

const checkout = asyncFunction(async (req, res, next) => {
  const { address, region, paymentMethod } = req.body;

  const user = await User.findById(req.auth.userId);

  const cart = await Cart.findOne({ buyer: req.auth.userId }).populate({
    path: "products.product",
    select: "title_en finalPrice coverImage verificationStatus",
  });

  if (!cart || cart.products.length === 0) {
    return next(new Error("Your cart is empty!"));
  }
  const unapprovedProducts = cart.products.filter(
    (item) => item.product.verificationStatus !== "approved",
  );
  if (unapprovedProducts.length > 0) {
    const productNames = unapprovedProducts
      .map((item) => item.product.title_en)
      .join(", ");
    return next(
      new ApiError(
        `The following products are not available for purchase yet: ${productNames}`,
        400,
      ),
    );
  }

  const shippingFees = { cairo: 70, giza: 100 };
  const deliveryFee = shippingFees[region.toLowerCase()] || 120;
  const subtotal = cart.products.reduce((sum, item) => {
    return sum + item.product.finalPrice * item.quantity;
  }, 0);
  const totalPrice = subtotal + deliveryFee;

  const newOrder = await Order.create({
    user: req.auth.userId,
    orderItems: cart.products.map((item) => ({
      product: item.product._id,
      name: item.product.title_en,
      quantity: item.quantity,
      price: item.product.finalPrice,
      coverImage: item.product.coverImage,
    })),
    subtotal: subtotal,
    deliveryFee: deliveryFee,
    totalPrice: totalPrice,
    addressDetails: {
      first_name: user.firstname,
      last_name: user.lastname,
      email: user.email,
      phone_number: user.phone,
      city: region,
      street: address || "N/A",
      state: region,
    },
    paymentMethod: paymentMethod,
    orderStatus: "pending",
  });

  if (paymentMethod === "online") {
    // call PayMob service
    const paymentUrl = await paymentService.generatePaymentLink(newOrder);

    return res.status(200).json({
      status: "success",
      message: "Redirect to payment",
      url: paymentUrl,
      orderId: newOrder._id,
      data: { newOrder },
    });
  } else {
    // create order and delete from cart
    await Cart.findOneAndDelete({ buyer: req.auth.userId });

    return res.status(201).json({
      status: "success",
      message: "Order placed successfully!",
      data: newOrder,
    });
  }
});

const checkoutResponse = asyncFunction(async (req, res) => {
  // Paymob send them
  const { success, order } = req.query;
  if (success === "true") {
    return res.redirect(`http://localhost:5173/order-success?orderId=${order}`);
  } else {
    return res.redirect(`http://localhost:5173/cart?error=payment_failed`);
  }
});

const getAllMyOrders = asyncFunction(async (req, res, next) => {
  const { sellerId } = req.params;
  const seller = await User.findById(sellerId);
  if (!seller || seller.role !== "seller")
    return next(new ApiError("Seller not found", 404));

  let orders = await Order.find({ isPaid: true })
    .populate({
      path: "orderItems.product",
      select: "title_ar originalPrice coverImage verificationStatus seller",
    })
    .select("orderItems.quantity orderItems.product")
    .sort("-createdAt");

  let filteredItems = []; //to return items based on sellerId
  orders.forEach((order) => {
    const sellerItems = order.orderItems.filter(
      (item) => item.product && item.product.seller.toString() === sellerId,
    );
    filteredItems.push(...sellerItems);
  });

  res.status(200).json({
    status: "success",
    results: filteredItems.length,
    data: { orderItems: filteredItems },
  });
});

module.exports = {
  checkout,
  checkoutResponse,
  getAllMyOrders,
};
