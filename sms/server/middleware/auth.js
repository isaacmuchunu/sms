const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * Authenticate user via JWT token from Authorization header.
 * Attaches the user object to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Check for Bearer token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new ApiError('Not authorized to access this route', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new ApiError('User not found', 401));
    }

    if (user.status === 'inactive') {
      return next(new ApiError('Your account has been deactivated', 403));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new ApiError('Invalid token', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError('Token expired', 401));
    }
    next(error);
  }
};

/**
 * Authorize access based on user roles.
 * Must be used after authenticate middleware.
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(
          `Access denied. Required role(s): ${roles.join(', ')}`,
          403
        )
      );
    }

    next();
  };
};

module.exports = { authenticate, authorize };
