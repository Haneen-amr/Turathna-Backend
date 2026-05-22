const asyncFunction = require("../middlewares/asyncMW");
const User = require("../models/userModel");
const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
// const Product = require("../models/productModel");
const paymob = require("../services/paymobService");
const ApiError = require("../utils/apiError");

const checkout = asyncFunction(async (req, res, next) => {
  const { address, region, paymentMethod } = req.body;
  const user = await User.findById(req.auth.userId);
  if (!user) return next(new ApiError("User not found", 404));

  const cart = await Cart.findOne({ buyer: req.auth.userId }).populate({
    path: "products.product",
    select: "title_en finalPrice coverImage verificationStatus",
  });

  if (!cart || cart.products.length === 0) {
    return next(new Error("Your cart is empty!"));
  }

  // const unapprovedProducts = cart.products.filter(
  //   (item) => item.product.verificationStatus !== "approved",
  // );
  // if (unapprovedProducts.length > 0) {
  //   const productNames = unapprovedProducts
  //     .map((item) => item.product.title_en)
  //     .join(", ");
  //   return next(
  //     new ApiError(
  //       `The following products are not available for purchase yet: ${productNames}`,
  //       400,
  //     ),
  //   );
  // }

  const shippingFees = { cairo: 70, giza: 100 };
  const deliveryFee = shippingFees[region.toLowerCase()] || 120;
  const subtotal = cart.products.reduce((sum, item) => {
    // const isApproved = item.product.verificationStatus === "approved";
    // const finalProductPrice = isApproved ? item.product.finalPrice : item.priceStored;
    // return sum + (finalProductPrice * item.quantity);

    return sum + item.product.finalPrice * item.quantity;
  }, 0);
  const totalPrice = subtotal + deliveryFee;

  // create a snapshot to be stored as final order
  const newOrder = await Order.create({
    user: req.auth.userId,
    orderItems: cart.products.map((item) => ({
      // const isApproved = item.product.verificationStatus === "approved";
      // const finalProductPrice = isApproved ? item.product.finalPrice : item.priceStored;

      // return {
      //   product: item.product._id,
      //   name: item.product.title_en,
      //   quantity: item.quantity,
      //   price: finalProductPrice,
      //   coverImage: item.product.coverImage,
      // };

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
    const paymentUrl = await paymob.generatePaymentLink(newOrder);

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
    await Order.findOneAndUpdate({ orderStatus: "in progress" });

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
  const FRONTEND_URL = process.env.CLIENT_URL;
  const dbOrder = await Order.findOne({ paymobOrderId: order });
  if (!dbOrder) {
    return res.redirect(`${FRONTEND_URL}/cart?error=order_not_found`);
  }

  if (success === "true") {
    return res.redirect(`${FRONTEND_URL}/order-success?orderId=${dbOrder._id}`);
  } else {
    return res.redirect(`${FRONTEND_URL}/cart?error=payment_failed`);
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
      select: "title_ar originalPrice coverImage orderStatus seller orderDate",
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
