const mongoose = require("mongoose");
//const valid = require("validator");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 5,
    },
    role: {
      type: String,
      enum: ["admin", "buyer", "seller"],
      default: "buyer",
    },

    // If the User is Buyer
    email: {
      type: String,
      required: function () {
        return this.role === "buyer";
      },
    },

    // If the User is Seller
    storeLocation: {
      type: String,
      enum: ["online", "offline"],
      required: function () {
        return this.role === "seller";
      },
    },
    productImages: [String],
    required: function () {
      return this.role === "seller";
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "declined"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
