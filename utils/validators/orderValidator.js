const Ajv = require("ajv");
const ajvFormats = require("ajv-formats");
const ajvErrors = require("ajv-errors");
const userModel = require("../../models/userModel");
const ajv = new Ajv({ allErrors: true, strict: false, coerceTypes: true });
ajvFormats(ajv);
ajvErrors(ajv);

const orderSchema = {
  type: "object",
  properties: {
    buyer: {
      type: "string",
      pattern: "^[0-9a-fA-F]{24}$",
      errorMessage: "Invalid user ID format",
    },
    orderItems: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          product: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
          name: { type: "string" },
          quantity: { type: "number", minimum: 1 },
          price: { type: "number", minimum: 0 },
          coverImage: { type: "string" },
        },
        required: ["product", "name", "quantity", "price"],
      },
    },
    addressDetails: {
      type: "object",
      properties: {
        first_name: { type: "string" },
        last_name: { type: "string" },
        email: { type: "string", format: "email" },
        phone_number: { type: "string" },
        city: { type: "string" },
        street: { type: "string" },
        postal_code: { type: "string", default: "12345" },
      },
      required: ["first_name", "last_name", "email", "phone_number"],
    },
    subtotal: { type: "number" },
    deliveryFee: { type: "number" },
    totalPrice: { type: "number" },
    paymentMethod: { type: "string", enum: ["online", "cash"] },
    orderStatus: {
      type: "string",
      enum: ["in progress", "finished"],
    },
    shippingStatus: {
      type: "string",
      enum: ["pending", "out for delivery", "delivered"],
    },
    isPaid: { type: "boolean" },
    paidAt: { type: "string", format: "date-time" },
  },
  required: [
    "user",
    "orderItems",
    "addressDetails",
    "totalPrice",
    "paymentMethod",
  ],
};
