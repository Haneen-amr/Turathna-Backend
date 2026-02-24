const ApiError = require("../utils/apiError");

// **Profile owner only (not admin)**
function checkAuth(req, res, nxt) {
  if (!req.auth) {
    return nxt(new ApiError("Please login first!", 403));
  }
  return nxt();
}

function checkAdmin(req, res, nxt) {
  if (req.auth.role === "admin") {
    return nxt();
  }
  return nxt(new ApiError("For Admins only!", 403));
}

// Owners (their own account) or admins
function checkOwnerOrAdmin(req, res, nxt) {
  const isOwner = req.auth.userId === req.params.id;
  const isAdmin = req.auth.role === "admin";
  if (isOwner || isAdmin) {
    return nxt();
  }
  return nxt(new ApiError("Unauthorized Access!", 403));
}

// **Any logged-in user but not admin (for placing orders)**
function checkNonAdminUser(req, res, nxt) {
  if (req.auth.role === "admin") {
    return nxt(new ApiError("Admins cannot perform this action", 403));
  }

  if (req.body.userId && req.body.userId !== req.auth.userId) {
    return nxt(new ApiError("User ID mismatch!", 403));
  }
  nxt();
}

module.exports = {
  checkAdmin,
  checkOwnerOrAdmin,
  checkAuth,
  checkNonAdminUser,
};
