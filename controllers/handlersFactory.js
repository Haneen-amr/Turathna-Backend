const asyncFunction = require("../middlewares/asyncMW");
const ApiError = require("../utils/apiError");

exports.delete = (Model, paramName = "id") =>
  asyncFunction(async (req, res, next) => {
    const id = req.params[paramName];
    const document = await Model.findByIdAndDelete(id);
    if (!document)
      return next(
        new ApiError(
          `${Model.modelName} with the given ID '${req.params.id}' is not found`,
          404,
        ),
      );
    return res.status(200).json({
      success: true,
      message: `${Model.modelName} deleted successfully`,
    });
  });
