const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        quantity: {
          type: Number,
          default: 1,
        },
        totalPrice: {
          type: Number,
        },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Cart", cartSchema);
