const User = require("../models/userModel");
module.exports = (validator, role) => {
  return async (req, res, next) => {
    const dataToValidate = { ...req.body, role: role || req.params.role };

    const valid = validator(dataToValidate);

    if (!valid) {
      return res.status(400).json({
        status: "fail",
        message: "Validation Error",
        errors: validator.errors.map((err) => ({
          path: err.instancePath.substring(1) || err.params.missingProperty,
          message: err.message,
        })),
      });
    }

    req.body = dataToValidate;
    next();
  };
};
