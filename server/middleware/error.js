const ApiError = require('../utils/ApiError');

/**
 * Global error handling middleware.
 * Catches all errors thrown in the application and sends a standardized response.
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log error
  console.error('Error:', {
    name: err.name,
    message: err.message,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });

  // PostgreSQL unique violation (23505)
  if (err.code === '23505') {
    const field = err.constraint || 'field';
    const message = `Duplicate field value: ${field}`;
    error = new ApiError(message, 400);
  }

  // PostgreSQL foreign key violation (23503)
  if (err.code === '23503') {
    const message = 'Referenced record does not exist';
    error = new ApiError(message, 400);
  }

  // PostgreSQL invalid text representation (22P02)
  if (err.code === '22P02') {
    const message = 'Invalid input';
    error = new ApiError(message, 400);
  }

  // PostgreSQL not null violation (23502)
  if (err.code === '23502') {
    const field = err.column || 'field';
    const message = `Missing required field: ${field}`;
    error = new ApiError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token. Please log in again.';
    error = new ApiError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Your token has expired. Please log in again.';
    error = new ApiError(message, 401);
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(isDev && {
      stack: error.stack,
      error: error,
    }),
    timestamp: new Date().toISOString(),
  });
};

module.exports = { errorHandler };
