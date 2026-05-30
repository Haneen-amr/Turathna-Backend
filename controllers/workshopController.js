const asyncFunction = require("../middlewares/asyncMW");
const ApiError = require("../utils/apiError");
const Workshop = require("../models/workshopModel");
const Reservation = require("../models/reservationModel");
const User = require("../models/userModel");
const { autoTranslate } = require("./translationController");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

  try {
    const embedding = await generateEmbedding(newWorkshop);
    if (embedding) {
      await Workshop.updateOne(
        { _id: newWorkshop._id },
        { $set: { embeddings: embedding } },
      );
    }
  } catch (err) {
    console.error("[addWorkshop] Embedding failed:", err.message);
  }

  let result = newWorkshop.toObject();
  delete result.finalPrice;

  res.status(201).json({
    status: "success",
    message: "Workshop submitted & waiting for approval",
    data: result,
  });
});

// ─────────────────────────────────────────────
// EMBEDDING HELPER — call this on create & update
// ─────────────────────────────────────────────
const generateEmbedding = async (workshop) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" }); // ← correct model name
    const result = await model.embedContent({
      content: {
        parts: [{ text: `${workshop.title_en} ${workshop.description_en}` }],
      },
      outputDimensionality: 768, // ← this only works on gemini-embedding-001, not 004
    });
    return result.embedding.values;
  } catch (err) {
    console.error("[Embedding Helper Error]:", err.message);
    return null;
  }
};

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

    // ── Try vector search first ──────────────────────────────────────────
    let excludeIds = [workshop._id];
    if (workshop.embeddings?.length > 0) {
      try {
        relatedWorkshops = await Workshop.aggregate([
          {
            $vectorSearch: {
              index: "workshops_search_index",
              path: "embeddings",
              queryVector: workshop.embeddings,
              numCandidates: 50,
              limit: 6, // fetch more than needed so we can filter
              filter: {
                verificationStatus: { $eq: "approved" },
                date: { $gt: today },
                seats: { $gt: 0 },
              },
            },
          },
          // exclude the current workshop after the search
          {
            $match: { _id: { $ne: workshop._id } },
          },
          { $limit: 3 },
          {
            $project: {
              title_ar: 1,
              title_en: 1,
              description_ar: 1,
              description_en: 1,
              finalPrice: 1,
              coverImage: 1,
              date: 1,
              time: 1,
              seats: 1,
              workshopOffline: 1,
              workshopOnline: 1,
            },
          },
        ]);
        relatedWorkshops.forEach((w) => excludeIds.push(w._id));
      } catch (err) {
        console.error("[Vector Search] Failed:", err.message);
        relatedWorkshops = []; // ensure fallback runs
      }
    }

    // ── Fallback: fill up to 3 with random workshops ────────
    // Runs if: no embeddings, vector search failed, or returned < 3 results
    if (relatedWorkshops.length < 3) {
      const needed = 3 - relatedWorkshops.length;
      const excludeIds = [workshop._id, ...relatedWorkshops.map((p) => p._id)];

      try {
        const fallbackWorkshops = await Workshop.aggregate([
          {
            $match: {
              _id: { $nin: excludeIds },
              verificationStatus: "approved",
              date: { $gt: today },
              seats: { $gt: 0 },
            },
          },
          { $sort: { createdAt: -1 } },
          { $sample: { size: needed } },
          {
            $project: {
              title_ar: 1,
              title_en: 1,
              finalPrice: 1,
              coverImage: 1,
              date: 1,
              time: 1,
              seats: 1,
              workshopOffline: 1,
              workshopOnline: 1,
            },
          },
        ]);

        relatedWorkshops = [...relatedWorkshops, ...fallbackWorkshops];
      } catch (err) {
        console.error("[Random Fallback] Failed:", err.message);
      }
    }
  }

  const workshopObj = workshop.toObject();
  delete workshopObj.embeddings;

  res.status(200).json({
    success: true,
    data: { workshop: workshopObj, relatedWorkshops },
  });
});

// ─────────────────────────────────────────────
// ONE-TIME MIGRATION SCRIPT
// Run manually: node -e "require('./controllers/workshopController').migrateEmbeddings()"
// ─────────────────────────────────────────────
const migrateEmbeddings = asyncFunction(async (req, res, next) => {
  // Only migrate workshops that have English content but no embeddings yet
  const workshops = await Workshop.find({
    $or: [
      { embeddings: { $exists: false } },
      { embeddings: { $eq: [] } },
      { embeddings: null },
    ],
    title_en: { $exists: true, $ne: "" },
  });

  console.log(`[Migration] Found ${workshops.length} workshops to embed`);

  for (const w of workshops) {
    const values = await generateEmbedding(w);
    if (values) {
      await Workshop.updateOne(
        { _id: w._id },
        { $set: { embeddings: values } },
      );
      console.log(`[Migration] ✓ ${w._id}`);
    } else {
      console.log(`[Migration] ✗ Failed: ${w._id} (Check Internet/API Key)`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  res.status(200).json({
    status: "success",
    message: `Migration completed. Updated ${workshops.length} workshops.`,
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
  generateEmbedding,
  getWorkshopByID,
  migrateEmbeddings,
  addWorkshop,
  deleteWorkshop,
};
