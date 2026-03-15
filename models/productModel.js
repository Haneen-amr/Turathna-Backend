const mongoose = require("mongoose");
const { CATEGORIES_INFO, REGIONS_INFO } = require("../utils/constants");

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
    description_video: { type: String },
    descriptionType: {
      type: String,
      enum: ["text", "video"],
      default: "text",
    },
    description_en: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
    },
    coverImage: {
      type: String,
      required: true,
    },
    productImages: {
      type: [String],
    },
    review: {
      type: String,
    },
    category: {
      type: String,
      enum: Object.keys(CATEGORIES_INFO),
    },
    categoryDescription: String,
    region: {
      type: [String],
      required: [true, "Product must have at least one region"],
      enum: Object.keys(REGIONS_INFO),
    },
    regionDescription: [String],
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

productSchema.pre("save", async function () {
  if (this.category) {
    this.categoryDescription = CATEGORIES_INFO[this.category];
  }
  if (this.region) {
    this.regionDescription = this.region.map((reg) => REGIONS_INFO[reg]);
  }
});

module.exports = mongoose.model("Product", productSchema);
