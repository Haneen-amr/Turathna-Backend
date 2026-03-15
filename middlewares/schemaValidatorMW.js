module.exports = (validator, role = {}) => {
  return (req, res, next) => {
    const dataToValidate = { ...req.body, ...role };

    const valid = validator(dataToValidate);

    if (!valid) {
      return res.status(400).json({
        status: "fail",
        message: "Validation Error",
        errors: validator.errors.map((err) => ({
          path:
            err.instancePath.substring(1) ||
            err.params.additionalProperty ||
            err.params.missingProperty,
          message: err.message,
        })),
      });
    }

    next();
  };
};
