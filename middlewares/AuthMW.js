const ApiError = require("../utils/apiError");
const jwt = require("jsonwebtoken");

const protect = async (req, res, next) => {
  let token = req.headers.authorization;
  if (token && token.startsWith("Bearer ")) {
    token = token.split(" ")[1];
  }

  if (!token) {
    return next(new ApiError("Pease login first", 401));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = {
      userId: String(decoded.userId),
      role: decoded.role,
    };

    next();
  } catch (err) {
    return next(new ApiError("Invalid or expired token", 401));
  }
};

// Dynamic MW to check role
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.auth.role)) {
      return next(
        new ApiError("You do not have permission to perform this action", 403),
      );
    }
    next();
  };
};

// Owners (their own account)
function isOwner(req, res, next) {
  const isOwner = req.auth.userId === req.params.id;
  if (!isOwner) {
    return next(
      new ApiError(
        "Unauthorized Access! You can only manage your own data.",
        403,
      ),
    );
  }
  next();
}

module.exports = {
  protect,
  restrictTo,
  isOwner,
};
