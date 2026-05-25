const asyncFunction = require("../middlewares/asyncMW");
const User = require("../models/userModel");
const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
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

  const shippingFees = { cairo: 70, giza: 100 };
  const deliveryFee = shippingFees[region.toLowerCase()] || 120;
  const subtotal = cart.products.reduce((sum, item) => {
    return sum + item.product.finalPrice * item.quantity;
  }, 0);
  const totalPrice = subtotal + deliveryFee;

  // create a snapshot to be stored as final order
  const newOrder = await Order.create({
    buyer: req.auth.userId,
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
    orderStatus: "in progress",
  });

  if (paymentMethod === "online") {
    // call PayMob service
    const paymentUrl = await paymob.generatePaymentLink(newOrder);
    await Cart.findOneAndDelete({ buyer: req.auth.userId });
    newOrder.isPaid = true;
    await newOrder.save();
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
      data: { newOrder },
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

const getMyOrders = asyncFunction(async (req, res, next) => {
  const buyerId = req.params.id;

  const buyer = await User.findById(buyerId).select("-password -__v");
  console.log("Searching for Buyer ID:", buyer);
  console.log(req.params.id);
  if (!buyer || buyer.role !== "buyer")
    return next(new ApiError("Buyer not found", 404));

  const query = {
    buyer: req.params.id,
    $or: [{ isPaid: true }, { paymentMethod: "cash" }],
  };

  let orders = await Order.find(query)
    .populate({
      path: "orderItems.product",
      select: "title_ar title_en finalPrice coverImage",
    })
    .select(
      "addressDetails.first_name addressDetails.last_name addressDetails.phone_number orderItems.quantity orderStatus shippingStatus createdAt",
    )
    .sort("-createdAt")
    .lean();

  if (!orders || orders.length === 0)
    return next(new ApiError("No Orders Available", 404));

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

const getAllMyOrders = asyncFunction(async (req, res, next) => {
  const { id } = req.params;
  const seller = await User.findById(id);
  if (!seller || seller.role !== "seller")
    return next(new ApiError("Seller not found", 404));

  let orders = await Order.find({
    $or: [{ isPaid: true }, { paymentMethod: "cash" }],
    "orderItems.product": { $exists: true },
  })
    .populate({
      path: "orderItems.product",
      select: "title_ar originalPrice coverImage seller",
    })
    .select("orderItems.quantity orderItems.itemStatus orderStatus createdAt")
    .sort("-createdAt")
    .lean();

  const sellerOrders = orders
    .map((order) => {
      const orderItems = order.orderItems.filter(
        (item) =>
          item.product &&
          item.product.seller &&
          item.product.seller.toString() === id,
      );

      if (orderItems.length > 0) {
        return {
          orderId: order._id,
          orderItems: orderItems,
          orderStatus: order.orderStatus,
          orderDate: order.createdAt.toISOString().split("T")[0],
        };
      }
      return null;
    })
    .filter((order) => order !== null);

  res.status(200).json({
    status: "success",
    results: sellerOrders.length,
    data: { orders: sellerOrders },
  });
});

const editOrderStatus = asyncFunction(async (req, res, next) => {
  const { orderId, productId } = req.params;
  const sellerId = req.auth.userId;
  const status = "finished";

  const order = await Order.findById(orderId)
    .populate({
      path: "orderItems.product",
      match: { seller: sellerId },
      select: "title_ar originalPrice coverImage seller",
    })
    .select("orderItems.quantity orderItems.itemStatus orderStatus createdAt");
  if (!order) return next(new ApiError("Order not found", 404));

  const itemIndex = order.orderItems.findIndex(
    (item) => item.product && item.product._id.toString() === productId,
  );

  if (itemIndex === -1) {
    // -1 => element not found (index = -1)
    return next(new ApiError("Item is not found", 403));
  }

  order.orderItems[itemIndex].itemStatus = status;

  const orderFinished = order.orderItems.every(
    (item) => item.itemStatus === "finished",
  );

  if (orderFinished) {
    order.orderStatus = "finished";
  }

  await order.save();

  const sellerOrder = order.toObject();
  sellerOrder.orderItems = sellerOrder.orderItems.filter(
    (item) => item.product !== null,
  );

  res.status(200).json({
    status: "success",
    message: "Item status updated to 'Finished'",
    data: { sellerOrder },
  });
});

module.exports = {
  checkout,
  checkoutResponse,
  getMyOrders,
  getAllMyOrders,
  editOrderStatus,
};
