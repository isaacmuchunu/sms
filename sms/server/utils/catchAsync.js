/**
 * Wraps an async route handler to catch errors and pass them to Express error middleware.
 * Eliminates the need for try/catch blocks in every controller function.
 * 
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;
