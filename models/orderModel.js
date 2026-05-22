const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        coverImage: {
          type: String,
        },
      },
      { _id: false },
    ],
    addressDetails: {
      first_name: { type: String, required: true },
      last_name: { type: String, required: true },
      email: { type: String, required: true },
      phone_number: { type: String, required: true },
      city: { type: String },
      street: { type: String },
      building: String,
      floor: String,
      apartment: String,
      state: String,
      postal_code: { type: String, default: "12345" },
    },
    subtotal: {
      type: Number,
      required: true,
    },
    deliveryFee: {
      type: Number,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    orderDate: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: ["online", "cash"],
      required: true,
    },
    orderStatus: {
      type: String,
      enum: ["pending", "in progress", "finished"],
      default: "pending",
    },
    shippingStatus: {
      type: String,
      enum: ["in progress", "out for delivery", "delivered"],
      default: "in progress",
    },

    paymobOrderId: {
      type: String,
      unique: true,
      sparse: true, //since COD has no Id
    },
    paymobTransactionId: {
      type: String,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", orderSchema);
