const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

const setRefreshCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());
};

const clearRefreshCookie = (res) => {
  res.cookie('refreshToken', '', {
    ...getRefreshCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  });
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
  });
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });
};

const assertStrongPassword = (password, fieldName = 'Password') => {
  if (!password || password.length < 8) {
    throw new ApiError(`${fieldName} must be at least 8 characters`, 400);
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new ApiError(`${fieldName} must include at least one letter and one number`, 400);
  }
};

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Admin only
exports.register = catchAsync(async (req, res) => {
  const { name, email, password, role, phone, address } = req.body;

  assertStrongPassword(password);

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError('User with this email already exists', 400);
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: role || 'student',
    phone,
    address,
  });

  // Generate token
  const token = generateToken(user._id);

  // Return user without password
  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    createdAt: user.createdAt,
  };

  return ApiResponse.success(res, { user: userResponse, token }, 'User registered successfully', 201);
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError('Please provide email and password', 400);
  }

  // Find user by email
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError('Invalid credentials', 401);
  }

  // Compare password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError('Invalid credentials', 401);
  }

  // Check if user is active
  if (user.status === 'inactive') {
    throw new ApiError('Your account has been deactivated. Please contact admin.', 403);
  }

  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save only a hash of the refresh token so DB disclosure does not expose sessions
  user.refreshToken = hashToken(refreshToken);
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  setRefreshCookie(res, refreshToken);

  // Return user without password
  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
  };

  return ApiResponse.success(res, { user: userResponse, token }, 'Login successful');
});

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh-token
// @access  Public (with refresh cookie)
exports.refreshToken = catchAsync(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    throw new ApiError('No refresh token provided', 401);
  }

  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  const refreshTokenHash = hashToken(refreshToken);

  // Find user
  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== refreshTokenHash) {
    throw new ApiError('Invalid refresh token', 401);
  }

  if (user.status === 'inactive') {
    throw new ApiError('Your account has been deactivated', 403);
  }

  // Rotate refresh token on every refresh.
  const newAccessToken = generateToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  user.refreshToken = hashToken(newRefreshToken);
  await user.save({ validateBeforeSave: false });

  setRefreshCookie(res, newRefreshToken);

  return ApiResponse.success(res, { token: newAccessToken }, 'Token refreshed successfully');
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = catchAsync(async (req, res) => {
  clearRefreshCookie(res);

  // Clear refresh token from user if authenticated.
  if (req.user) {
    req.user.refreshToken = undefined;
    await req.user.save({ validateBeforeSave: false });
  } else {
    const refreshToken = req.cookies.refreshToken || req.body?.refreshToken;
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        await User.findByIdAndUpdate(decoded.id, { $unset: { refreshToken: 1 } });
      } catch {
        // Logout should stay idempotent even when the token is already invalid.
      }
    }
  }

  return ApiResponse.success(res, null, 'Logged out successfully');
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError('Please provide an email address', 400);
  }

  const user = await User.findOne({ email });
  if (!user) {
    return ApiResponse.success(res, null, 'If the email exists, a password reset link has been sent');
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash token and save to user
  user.resetPasswordToken = hashToken(resetToken);
  user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes

  await user.save({ validateBeforeSave: false });

  // Create reset URL
  const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

  // Send email (placeholder - integrate with email service)
  try {
    // await sendEmail({
    //   to: user.email,
    //   subject: 'Password Reset Request',
    //   html: `Click <a href="${resetUrl}">here</a> to reset your password.`,
    // });

    const data = process.env.NODE_ENV === 'production' ? null : { resetUrl };
    return ApiResponse.success(res, data, 'If the email exists, a password reset link has been sent');
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    throw new ApiError('Email could not be sent', 500);
  }
});

// @desc    Reset password
// @route   PUT /api/v1/auth/reset-password/:token
// @access  Public
exports.resetPassword = catchAsync(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  assertStrongPassword(password);

  // Hash token from params
  const resetTokenHash = hashToken(token);

  // Find user by reset token
  const user = await User.findOne({
    resetPasswordToken: resetTokenHash,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError('Invalid or expired reset token', 400);
  }

  user.password = password;
  user.refreshToken = undefined;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  return ApiResponse.success(res, null, 'Password reset successfully');
});

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    status: user.status,
    createdAt: user.createdAt,
  };

  return ApiResponse.success(res, { user: userResponse }, 'User details retrieved');
});

// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError('Please provide current password and new password', 400);
  }

  assertStrongPassword(newPassword, 'New password');

  // Get user with password
  const user = await User.findById(req.user.id).select('+password');

  // Verify current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ApiError('Current password is incorrect', 401);
  }

  user.password = newPassword;
  user.refreshToken = undefined;
  await user.save();

  return ApiResponse.success(res, null, 'Password updated successfully');
});

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
exports.updateDetails = catchAsync(async (req, res) => {
  const { name, email, phone, address } = req.body;

  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (phone) updateData.phone = phone;
  if (address) updateData.address = address;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    updateData,
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    status: user.status,
    updatedAt: user.updatedAt,
  };

  return ApiResponse.success(res, { user: userResponse }, 'User details updated successfully');
});
