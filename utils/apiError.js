// A custom error class that inherits from the built-in Error object
class ApiError extends Error {
  // The constructor runs whenever you create a new instance (new ApiError())
  constructor(message, statusCode) {
    super(message); // Calls the parent 'Error' constructor to set the error message property
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith(4) ? "fail" : "error"; // Sets status to 'fail' for 4xx codes (client errors) and 'error' for others (5xx)
    this.isOperational = true; // operational error means it is "predicted" so we can send a clean message to the client
  }
}

module.exports = ApiError;
