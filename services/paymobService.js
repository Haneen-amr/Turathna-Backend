const axios = require("axios");
//const asyncFunction = require("../middlewares/asyncMW");

const BASE_URL = "https://accept.paymob.com/api";

async function getAuthToken(apiKey) {
  const res = await axios.post(`${BASE_URL}/auth/tokens`, {
    api_key: apiKey,
  });
  return res.data.token;
}

async function createOrder(token, amount) {
  const res = await axios.post(`${BASE_URL}/ecommerce/orders`, {
    auth_token: token,
    delivery_needed: "false",
    amount_cents: Math.round(amount * 100),
    currency: "EGP",
    items: [],
  });
  return res.data;
}

async function createPaymentKey(
  token,
  orderId,
  amount,
  integrationId,
  addressDetails,
) {
  const res = await axios.post(`${BASE_URL}/acceptance/payment_keys`, {
    auth_token: token,
    amount_cents: amount,
    expiration: 3600,
    order_id: orderId,
    billing_data: {
      first_name: addressDetails?.first_name || "NA",
      last_name: addressDetails?.last_name || "NA",
      email: addressDetails?.email || "NA",
      phone_number: addressDetails?.phone_number || "NA",
      city: addressDetails?.city || "NA",
      street: addressDetails?.street || "NA",
      state: addressDetails?.state || "NA",
      apartment: "NA",
      floor: "NA",
      building: "NA",
      country: "EG",
    },
    currency: "EGP",
    integration_id: integrationId,
  });

  return res.data.token;
}

const generatePaymentLink = async (order) => {
  const token = await getAuthToken(process.env.PAYMOB_API_KEY);

  const paymobOrder = await createOrder(token, order.totalPrice * 100);

  const paymentToken = await createPaymentKey(
    token,
    Math.round(paymobOrder.id),
    order.totalPrice * 100,
    process.env.PAYMOB_INTEGRATION_ID,
    order.addressDetails,
  );

  order.paymobOrderId = paymobOrder.id;
  await order.save();

  return `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`;
};

module.exports = {
  getAuthToken,
  createOrder,
  createPaymentKey,
  generatePaymentLink,
};
