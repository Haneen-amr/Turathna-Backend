const ApiError = require("../utils/apiError");

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

// **Profile owner only (not admin)**
function checkAuth(req, res, next) {
  if (!req.auth) {
    return next(new ApiError("Please login first!", 401));
  }
  next();
}

// Owners (their own account)
function isOwner(req, res, next) {
  const isOwner = req.auth.userId === req.params.id;
  if (isOwner) {
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
  restrictTo,
  checkAuth,
  isOwner,
};
