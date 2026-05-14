const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userDetails: {
      firstname: { type: String },
      lastname: { type: String },
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
      finalPrice: { type: Number, required: true },
      date: { type: String, required: true },
      time: { type: String, required: true },
      coverImage: { type: String },
    },
    isReserved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Reservation", reservationSchema);
