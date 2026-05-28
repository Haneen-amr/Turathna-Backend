const asyncFunction = require("../middlewares/asyncMW");
const ApiError = require("../utils/apiError");
const Workshop = require("../models/workshopModel");
const Reservation = require("../models/reservationModel");
const User = require("../models/userModel");
const { autoTranslate } = require("./translationController");

const getAllWorkshops = asyncFunction(async (req, res, next) => {
  const now = new Date().toISOString().split("T")[0];
  let filterObject = {
    verificationStatus: "approved",
    date: { $gte: now },
    seats: { $gt: 0 },
  };

  let role = req.auth?.role;
  let userId = req.auth?.userId || req.auth?._id;

  if (role === "buyer") {
    const myReservations = await Reservation.find({
      user: userId,
      isReserved: true,
    }).distinct("workshop");
    delete filterObject.seats;
    filterObject.$or = [
      { seats: { $gt: 0 } },
      { _id: { $in: myReservations } },
    ];
  }

  const workshopsList = await Workshop.find(filterObject)
    .select(
      "title_ar title_en date time seats finalPrice coverImage workshopOffline workshopOnline",
    )
    .sort("-createdAt");

  if (workshopsList.length === 0) {
    return res.status(200).json({
      status: "success",
      message: "No workshops found",
      data: { workshops: [] },
    });
  }

  res.status(200).json({
    status: "success",
    results: workshopsList.length,
    data: { workshopsList },
  });
});

const getAllMyWorkshops = asyncFunction(async (req, res, next) => {
  let filterObject = {}; //to return workshops based on sellerId
  const now = new Date().toISOString().split("T")[0];
  if (req.params.id) {
    filterObject = { seller: req.params.id };
  }
  const seller = await User.findById(req.params.id).select("role");
  if (!seller || seller.role !== "seller")
    return next(new ApiError("Seller not found", 404));
  const workshops = await Workshop.find({
    ...filterObject,
    date: { $gt: now },
  })
    .select(
      "title_ar coverImage workshopImages originalPrice date time seats verificationStatus rejectionMsg",
    )
    .sort("-createdAt");
  if (workshops.length === 0) {
    return res.status(200).json({
      status: "success",
      message: "No workshops found",
      data: { workshops: [] },
    });
  }
  res.status(200).json({
    status: "success",
    results: workshops.length,
    data: { workshops },
  });
});

const addWorkshop = asyncFunction(async (req, res, next) => {
  const {
    title_ar,
    description_ar,
    originalPrice,
    coverImage,
    workshopImages,
    date,
    time,
    seats,
    workshopOffline,
    workshopOnline,
    workshopAddress,
    workshopLink,
  } = req.body;

  if (!description_ar)
    return next(
      new ApiError("A description must be added for the workshop", 404),
    );

  const percentage = 0.2;
  const finalPrice = originalPrice * (1 + percentage);

  let title_en = null;
  let description_en = null;
  try {
    const [translatedTitle, translatedDesc] = await Promise.all([
      title_en
        ? Promise.resolve(title_en)
        : autoTranslate(title_ar || title_ar, "en", "ar"),
      description_en
        ? Promise.resolve(description_en)
        : autoTranslate(description_ar || description_ar, "en", "ar"),
    ]);
    title_en = translatedTitle;
    description_en = translatedDesc;
  } catch (err) {
    return next(new ApiError(`Translation failed: ${err.message}`, 500));
  }

  const newWorkshop = await Workshop.create({
    title_ar,
    title_en,
    description_ar,
    description_en,
    originalPrice,
    finalPrice,
    coverImage,
    workshopImages,
    date,
    time,
    seats,
    workshopOffline,
    workshopOnline,
    workshopAddress,
    workshopLink,
    seller: req.params.id,
  });

  let result = newWorkshop.toObject();
  delete result.finalPrice;

  res.status(201).json({
    status: "success",
    message: "Workshop submitted & waiting for approval",
    data: result,
  });
});

const getWorkshopByID = asyncFunction(async (req, res, next) => {
  const { workshopId } = req.params;
  let query;
  if (req.auth?.role === "seller") {
    query = Workshop.findById(workshopId).select(
      "-title_en -description_en -finalPrice",
    );
  } else if (req.auth?.role === "admin") {
    query = Workshop.findById(workshopId);
  } else {
    query = Workshop.findOne({
      _id: workshopId,
      verificationStatus: "approved",
    }).select("-seller -verificationStatus -rejectionMsg -originalPrice");
  }

  const workshop = await query;
  if (!workshop) return next(new ApiError("Workshop not found", 404));

  let relatedWorkshops = [];
  if (req.auth?.role !== "seller" && req.auth?.role !== "admin") {
    const today = new Date().toISOString().split("T")[0];

    relatedWorkshops = await Workshop.aggregate([
      {
        $match: {
          _id: { $ne: workshop._id },
          verificationStatus: "approved",
          date: { $gt: today },
          seats: { $gt: 0 },
        },
      },
      {
        $sample: { size: 3 },
      },
      {
        $project: {
          title_ar: 1,
          title_en: 1,
          date: 1,
          time: 1,
          seats: 1,
          finalPrice: 1,
          coverImage: 1,
          workshopOffline: 1,
          workshopOnline: 1,
        },
      },
    ]);
  }

  res.status(200).json({
    success: true,
    data: { workshop, relatedWorkshops },
  });
});

const deleteWorkshop = asyncFunction(async (req, res, next) => {
  const { id, workshopId } = req.params;
  const workshop = await Workshop.findOneAndDelete({
    _id: workshopId,
    seller: id,
  });
  if (!workshop) {
    return next(
      new ApiError("Workshop not found or you don't have permission", 404),
    );
  }
  res.status(200).json({
    success: true,
    message: "Workshop deleted successfully",
  });
});

module.exports = {
  getAllWorkshops,
  getAllMyWorkshops,
  getWorkshopByID,
  addWorkshop,
  deleteWorkshop,
};
