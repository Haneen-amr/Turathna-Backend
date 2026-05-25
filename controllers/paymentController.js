const asyncFunction = require("../middlewares/asyncMW");
const ApiError = require("../utils/apiError");
const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const paymob = require("../services/paymobService");
const verifyHmac = require("../utils/hmac");

// const PAYMOB_API_URL = "https://accept.paymob.com/api";
// const iframe_URL = "https://accept.paymob.com/api/acceptance/iframes";
// const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
// const PAYMOB_INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID;
// const PAYMOB_IFRAME_ID = process.env.PAYMOB_IFRAME_ID;

const paymobWebhook = asyncFunction(async (req, res) => {
  const { hmac } = req.query;
  const transactionData = req.body.obj;
  if (!transactionData) {
    return res.status(400).send("No data received");
  }

  const isSecure = verifyHmac(
    transactionData,
    hmac,
    process.env.PAYMOB_HMAC_SECRET,
  );

  if (!isSecure) {
    console.error("HMAC Verification Failed! Potential fraud attempt.");
    return res.status(401).send("Unauthorized");
  }

  const isSuccess = String(transactionData.success) === "true";

  if (isSuccess) {
    console.log(
      `Payment Success for Paymob Order: ${transactionData.order.id}`,
    );

    const order = await Order.findOneAndUpdate(
      { paymobOrderId: String(transactionData.order.id) },
      {
        isPaid: true,
        paidAt: Date.now(),
        orderStatus: "in progress",
        //paymobTransactionId: transactionData.id,
      },
      { new: true },
    );

    if (order) {
      await Cart.findOneAndDelete({ buyer: order.user });
      console.log(`Cart cleared for user: ${order.user}`);
    }
  } else {
    console.log(`Payment failed for order: ${transactionData.order.id}`);
    await Order.findOneAndUpdate(
      { paymobOrderId: String(transactionData.order.id) },
      { orderStatus: "in progress" },
    );
  }

  res.status(200).send("OK");
});

module.exports = { paymobWebhook };
