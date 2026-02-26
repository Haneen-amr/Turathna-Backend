const asyncFunction = require("../middlewares/asyncMW");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const ApiError = require("../utils/apiError");
const User = require("../models/userModel");

const secret = process.env.JWT_SECRET;
const createToken = (payload) => {
  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return jwt.sign(payload, secret, { expiresIn: "1d" });
};

const buyerRegisteration = asyncFunction(async (req, res, next) => {
  const { firstname, lastname, email, phone, password } = req.body;

  const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
  if (existingUser)
    return next(
      new ApiError("The email or phone number already registered", 400),
    );

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await User.create({
    firstname,
    lastname,
    email,
    phone,
    password: hashedPassword,
    role: "buyer",
  });
  const token = createToken({ userId: newUser._id, role: newUser.role });

  res.status(201).json({
    status: "succes",
    message: "Buyer has registered successfully",
    token,
    data: {
      _id: newUser._id,
    },
  });
});

const sellerRegisteration = asyncFunction(async (req, res, next) => {
  const {
    name,
    phone,
    password,
    sellingOffline,
    sellingOnline,
    shopAddress,
    websiteLink,
  } = req.body;

  const existingUser = await User.findOne({ phone });
  if (existingUser)
    return next(new ApiError("هذا الرقم مسجل بالفعل", 400));

  const hashedPassword = await bcrypt.hash(password, 10);

  //const images = req.files ? req.files.map((file) => file.path) : productImages;
  // if (!images || images.length === 0) {
  //   return next(
  //     new ApiError("Please upload at least 5 images of your work", 400),
  //   );
  // }

  let images = [];
  if (req.files && req.files.length > 0) {
    images = req.files.map((file) => file.path);
  } else if (req.body.uploadedPhotos) {
    images = req.body.uploadedPhotos;
  }

  const newUser = await User.create({
    name,
    phone,
    password: hashedPassword,
    sellingOffline,
    sellingOnline,
    shopAddress,
    websiteLink,
    uploadedPhotos: images,
    role: "seller",
  });

  res.status(201).json({
    message: "Profile submitted and waiting for approval",
    data: {
      _id: newUser._id,
    },
  });
});

const buyerLogin = asyncFunction(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new ApiError("Please enter your email and password", 400));
  }
  const user = await User.findOne({ email, role: "buyer" });

  if (!user) return next(new ApiError("Invalid email or password!", 401));
  const validPswd = await bcrypt.compare(password, user.password);
  if (!validPswd) return next(new ApiError("Invalid email or password!", 401));
  const token = createToken({ userId: user._id, role: user.role });

  res.status(201).json({
    message: "Buyer has logged in successfully",
    token,
    data: {
      _id: user._id,
    },
  });
});

const sellerLogin = asyncFunction(async (req, res, next) => {
  const { phone, password } = req.body;
  const user = await User.findOne({ phone, role: "seller" });

  if (!phone || !password) {
    return next(new ApiError("Please enter your phone and password", 400));
  }
  if (!user)
    return next(new ApiError("Invalid phone number or password!", 401));
  const validPswd = await bcrypt.compare(password, user.password);
  if (!validPswd)
    return next(new ApiError("Invalid phone number or password!", 401));

  if (user.verificationStatus === "pending")
    return next(new ApiError("Your profile is still under review", 403));
  if (user.verificationStatus === "rejected")
    return next(new ApiError("Your profile was rejected", 403));

  const token = createToken({ userId: user._id, role: user.role });
  res.status(200).json({
    message: "Seller has logged in successfully",
    token,
    data: {
      _id: user._id,
    },
  });
});

module.exports = {
  buyerRegisteration,
  sellerRegisteration,
  buyerLogin,
  sellerLogin,
};
