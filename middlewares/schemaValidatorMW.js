module.exports = (validator, role) => {
  return (req, res, next) => {
    const dataToValidate = { ...req.body, role: role || req.params.role };

    const valid = validator(dataToValidate);
    console.log("Data being validated:", dataToValidate);

    if (!valid) {
      console.log("VALIDATION ERRORS:", validator.errors);
      return res.status(400).json({
        status: "fail",
        message: "Validation Error",
        errors: validator.errors.map((err) => ({
          path: err.instancePath.substring(1) || err.params.missingProperty,
          message: err.message,
        })),
      });
    }
    next();
  };
};
