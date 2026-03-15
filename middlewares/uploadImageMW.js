const multer = require("multer");
const ApiError = require("../utils/apiError");
const fs = require("fs");
const path = require("path");

const FILE_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "video/mp4": "mp4", // Added video types
  "video/mpeg": "mpeg",
  "video/quicktime": "mov",
};

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads");
  },
  filename: function (req, file, cb) {
    const ext = FILE_TYPE_MAP[file.mimetype];
    if (!ext) return cb(new ApiError("Unsupported file type", 400));
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}.${ext}`);
  },
});

//To make sure the files are images/videos only
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image") || file.mimetype.startsWith("video")) {
    cb(null, true);
  } else {
    cb(new ApiError("Only Images and Videos are allowed", 400), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: multerFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, //max. 100 megabites
});

const uploadFiles = (imageFieldName, maxCount = 5) => {
  const uploadFields = upload.fields([
    { name: imageFieldName, maxCount: maxCount },
    { name: "productImages", maxCount: 5 },
    { name: "description_video", maxCount: 1 },
  ]);
  return (req, res, next) => {
    uploadFields(req, res, (err) => {
      if (err) {
        console.log("Multer Error:", err); // هيطبع لك الغلط هنا في الـ terminal
        return next(new ApiError(err.message, 400));
      }
      next();
    });
  };
};

const processFiles = (imageFieldName) => {
  return (req, res, next) => {
    console.log("Files received:", req.files);
    if (!req.files) return next();
    // handle dynamic field names
    if (req.files[imageFieldName]) {
      req.body[imageFieldName] = req.files[imageFieldName].map(
        (file) =>
          `${req.protocol}://${req.get("host")}/public/uploads/${file.filename}`,
      );
    }
    // Handle Product Images
    if (req.files.productImages) {
      req.body.productImages = req.files.productImages.map(
        (file) =>
          `${req.protocol}://${req.get("host")}/public/uploads/${file.filename}`,
      );
      req.body.coverImage = req.body.productImages[0];
    }

    // 2. Handle Description Videos
    if (req.files.description_video) {
      const videoFile = req.files.description_video[0];
      req.body.description_video = `${req.protocol}://${req.get("host")}/public/uploads/${videoFile.filename}`;
      req.body.descriptionType = "video";
    }

    next();
  };
};

const deleteImageFromServer = (imageUrl) => {
  if (imageUrl) {
    const filename = imageUrl.split("/").pop();
    const filePath = path.join(__dirname, "../public/uploads", filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Successfully deleted: ${filename}`);
    }
  }
};

module.exports = {
  uploadFiles,
  processFiles,
  deleteImageFromServer,
};
