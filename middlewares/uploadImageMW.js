const multer = require("multer");
const ApiError = require("../utils/apiError");

const FILE_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
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

//To make sure the files are images only
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new ApiError("Only Images are allowed", 400), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: multerFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, //max. 2 megabites
});

const processImages = (req, res, next) => {
  if (req.files && req.files.length > 0) {
    req.body.uploadedPhotos = req.files.map(
      (file) =>
        `${req.protocol}://${req.get("host")}/public/uploads/${file.filename}`,
    );
  }
  next();
};

module.exports = {
  uploadImages: upload.array("uploadedPhotos", 5),
  processImages,
};
