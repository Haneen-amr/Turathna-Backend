const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title_ar: {
      type: String,
      required: true,
    },
    title_en: {
      type: String,
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
      set: (v) => (v ? Math.round(v) : v),
    },
    finalPrice: {
      type: Number,
      set: (v) => (v ? Math.round(v) : v),
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

    pendingUpdate: {
      title_ar: {
        type: String,
      },
      title_en: {
        type: String,
      },
      description_ar: {
        type: String,
      },
      description_en: {
        type: String,
      },
      originalPrice: {
        type: Number,
        set: (v) => (v ? Math.round(v) : v),
      },
      finalPrice: {
        type: Number,
        set: (v) => (v ? Math.round(v) : v),
      },
      coverImage: {
        type: String,
      },
      productImages: {
        type: [String],
      },
      region: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Region",
      },
      //updatedAt: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Product", productSchema);
