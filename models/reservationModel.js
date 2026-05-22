const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    buyerDetails: {
      firstname: { type: String },
      lastname: { type: String },
      phone: { type: String },
    },
    sellerDetails: {
      name: { type: String },
      phone: { type: String },
    },
    workshop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workshop",
      required: true,
    },
    workshopDetails: {
      title_ar: { type: String, required: true },
      title_en: { type: String, required: true },
      description_ar: { type: String, required: true },
      description_en: { type: String, required: true },
      finalPrice: { type: Number, required: true },
      date: { type: String, required: true },
      time: { type: String, required: true },
      coverImage: { type: String },
      workshopOffline: { type: Boolean },
      workshopOnline: { type: Boolean },
    },
    isReserved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Reservation", reservationSchema);
