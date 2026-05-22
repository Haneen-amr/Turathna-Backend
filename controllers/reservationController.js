const asyncFunction = require("../middlewares/asyncMW");
const User = require("../models/userModel");
const Reservation = require("../models/reservationModel");
const Workshop = require("../models/workshopModel");
const ApiError = require("../utils/apiError");
const mongoose = require("mongoose");

const postReservation = asyncFunction(async (req, res, next) => {
  const { workshopId } = req.params;
  const userId = req.auth.userId;
  const { firstname, lastname, phone } = req.body || {};

  const existingReservation = await Reservation.findOne({
    user: userId,
    workshop: workshopId,
    isReserved: true,
  });
  if (existingReservation) {
    return next(new ApiError("You have already reserved this workshop", 400));
  }

  const user = await User.findById(userId);
  if (!user) return next(new ApiError("User not found", 404));

  let workshop = await Workshop.findOneAndUpdate(
    { _id: workshopId, seats: { $gt: 0 }, verificationStatus: "approved" },
    { $inc: { seats: -1 } },
    { returnDocument: "after" },
  );
  if (!workshop)
    return next(new ApiError("Workshop not found or fully booked", 404));

  workshop = await workshop.populate("seller", "name phone");

  let newReservation = await Reservation.create({
    user: userId,
    buyerDetails: {
      firstname: firstname || user.firstname,
      lastname: lastname || user.lastname,
      phone: phone || user.phone,
    },
    sellerDetails: {
      name: workshop.seller?.name,
      phone: workshop.seller?.phone,
    },
    workshop: workshopId,
    workshopDetails: {
      title_ar: workshop.title_ar,
      title_en: workshop.title_en,
      description_ar: workshop.title_ar,
      description_en: workshop.title_en,
      finalPrice: workshop.finalPrice,
      date: workshop.date,
      time: workshop.time,
      coverImage: workshop.coverImage,
      workshopOffline: workshop.workshopOffline,
      workshopOnline: workshop.workshopOnline,
    },
    isReserved: true,
  });

  newReservation = newReservation.toObject();
  delete newReservation.sellerDetails;

  return res.status(201).json({
    status: "success",
    message: "Workshop Reserved Successfully",
    data: { reservation: newReservation },
  });
});

const getAllReservations = asyncFunction(async (req, res, next) => {
  const now = new Date().toISOString().split("T")[0];
  let filter = { isReserved: true, "workshopDetails.date": { $gte: now } };

  if (req.auth.role === "buyer") {
    filter.user = req.auth.userId;
  }

  const reservationsList = await Reservation.find(filter)
    .select("-__v")
    .sort("-createdAt")
    .lean();

  if (!reservationsList || reservationsList.length === 0)
    return next(new ApiError("No Workshops Reservations Available", 404));

  const data =
    req.auth.role === "buyer"
      ? reservationsList.map(({ sellerDetails, ...rest }) => rest) // hides seller info from buyer
      : reservationsList; // admins see everything, including sellerDetails

  res.status(200).json({
    status: "success",
    results: data.length,
    data: { data },
  });
});

const getAllMyReservations = asyncFunction(async (req, res, next) => {
  const { id } = req.params;
  console.log(id);
  const seller = await User.findById(id);
  console.log(seller);
  console.log(req.auth.userId);
  if (!seller || seller.role !== "seller")
    return next(new ApiError("Seller not found", 404));

  const now = new Date().toISOString().split("T")[0];

  const stats = await Workshop.aggregate([
    // filters seller's workshops
    {
      $match: {
        seller: new mongoose.Types.ObjectId(id),
        date: { $gte: now },
      },
    },
    // Connect Reservations with Workshops (Lookup)
    {
      $lookup: {
        from: "reservations",
        localField: "_id",
        foreignField: "workshop",
        as: "attendees",
      },
    },
    // filters reserved workshops
    {
      $addFields: {
        attendees: {
          $filter: {
            input: "$attendees",
            as: "res",
            cond: { $eq: ["$$res.isReserved", true] },
          },
        },
      },
    },
    {
      $project: {
        title_ar: 1,
        seats: 1,
        totalReserved: { $size: "$attendees" },
        attendees: {
          _id: 1,
          buyerDetails: 1,
          createdAt: 1,
        },
      },
    },
  ]);
  res.status(200).json({
    status: "success",
    results: stats.length,
    data: { workshops: stats },
  });
});

const cancelReservation = asyncFunction(async (req, res, next) => {
  const userId = req.auth.userId;
  const { reservationId } = req.params;

  const reservation = await Reservation.findOneAndDelete({
    _id: reservationId,
    user: userId,
  });
  if (!reservation) return next(new ApiError("No Reservation Found", 404));

  await Workshop.findByIdAndUpdate(reservation.workshop, {
    $inc: { seats: 1 },
  });

  res.status(200).json({
    success: true,
    message: "Reservation removed successfully",
  });
});

module.exports = {
  postReservation,
  getAllReservations,
  getAllMyReservations,
  cancelReservation,
};
