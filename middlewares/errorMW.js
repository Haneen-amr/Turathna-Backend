const globalError = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500; // 500 => Internal Server Error
  err.status = err.status || "error";
  if (res.headersSent) {
    return next(err);
  }
  if (process.env.NODE_ENV == "development") {
    ErrorForDev(err, res);
  } else {
    ErrorForProd(err, res);
  }
};

const ErrorForDev = (err, res) => {
  // Send the HTTP response
  res.status(err.statusCode).json({
    status: err.status, // Either 'fail' (4xx) or 'error' (5xx)
    error: err, // The full error object
    message: err.message, // The human-readable error message
    stack: err.stack, // The "stack trace" showing exactly which file/line caused the error
  });
};

const ErrorForProd = (err, res) => {
  // Send the HTTP response
  res.status(err.statusCode).json({
    status: err.status, // Either 'fail' (4xx) or 'error' (5xx)
    message: err.message, // The human-readable error message
  });
};

module.exports = globalError;
