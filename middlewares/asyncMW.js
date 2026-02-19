module.exports = function asyncFunction(routeHandler) {
  return async function (req, res, next) {
    try {
      await routeHandler(req, res, next);
    } catch (err) {
      console.error("Something went wrong!\n", err);
      next(err);
    }
  };
};
