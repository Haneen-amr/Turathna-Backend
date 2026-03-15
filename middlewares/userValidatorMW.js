const User = require("../models/userModel");
const ApiError = require("../utils/apiError");

const checkUniqueness = async (req, res, next) => {
  const { email, phone } = req.body;
  const query = [];

  if (email) query.push({ email });
  if (phone) query.push({ phone });

  if (query.length === 0) return next();

  // Find if another user (not the current one) has this email/phone
  const existingUser = await User.findOne({
    $or: query,
    _id: { $ne: req.auth?.userId },
  });

  if (existingUser) {
    const field =
      email && existingUser.email === email ? "Email" : "Phone number";
    return next(
      new ApiError(`${field} is already in use by another account!`, 400),
    );
  }

  next();
};

module.exports = checkUniqueness;
