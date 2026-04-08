const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title_ar: {
      type: String,
      required: true,
      trim: true,
    },
    title_en: {
      type: String,
      trim: true,
    },
    description_ar: {
      type: String,
    },
    description_en: {
      type: String,
    },
    heritage_text: {
      type: String,
    },
    heritage_video: {
      type: String,
    },
    heritageType: {
      type: String,
      enum: ["text", "video"],
    },
    originalPrice: {
      type: Number,
      set: (v) => Math.round(v),
    },
    finalPrice: {
      type: Number,
      set: (v) => Math.round(v),
    },
    coverImage: {
      type: String,
      //required: true,
    },
    productImages: {
      type: [String],
    },
    // review: {
    //   type: String,
    // },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    region: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Region",
      required: [true, "Product must belong to a region"],
    },
    seller: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Product must belong to a seller"],
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionMsg: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Product", productSchema);
