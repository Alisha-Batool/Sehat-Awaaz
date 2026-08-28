const logger = require('../utils/logger');

/**
 * Global error handler middleware.
 * Catches all errors and returns a structured JSON response.
 */
function errorHandler(err, req, res, _next) {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Default to 500
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    message:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
  });
}

/**
 * Wrap async route handlers to catch rejected promises
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { errorHandler, asyncHandler };
