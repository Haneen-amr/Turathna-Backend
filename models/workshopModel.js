const mongoose = require("mongoose");

const workshopSchema = new mongoose.Schema(
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
    },
    workshopImages: {
      type: [String],
    },
    date: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    seats: {
      type: Number,
      min: 0,
      required: true,
    },
    workshopOffline: {
      type: Boolean,
    },
    workshopOnline: {
      type: Boolean,
    },
    workshopAddress: {
      type: String,
      required: function () {
        return this.workshopOffline;
      },
    },
    workshopLink: {
      type: String,
      required: function () {
        return this.workshopOnline;
      },
    },
    seller: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Workshop must belong to a seller"],
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionMsg: {
      type: String,
    },
    embeddings: {
      type: [Number],
    },
  },
  {
    timestamps: true,
  },
);

workshopSchema.pre("save", function () {
  if (this.isModified("originalPrice")) {
    this.finalPrice = Math.round(this.originalPrice * 1.2);
  }
});

module.exports = mongoose.model("Workshop", workshopSchema);
