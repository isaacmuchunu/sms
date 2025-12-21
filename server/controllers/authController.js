const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { sendEmail, sendTemplatedEmail } = require('../utils/emailService');
const { sendSMS } = require('../utils/smsService');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
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
const generateToken = (userId, sessionId, schoolId) => {
  const payload = { id: userId };
  if (sessionId) payload.sessionId = sessionId;
  if (schoolId) payload.schoolId = schoolId;
  return jwt.sign(payload, process.env.JWT_SECRET, {
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

const generateRandomPassword = () => {
  return `${crypto.randomBytes(8).toString('hex')}A1!`;
};

const generateSetPasswordToken = async (user, expiresMinutes = 24 * 60) => {
  const token = crypto.randomBytes(32).toString('hex');
  await db.update(
    'users',
    {
      password_reset_token: hashToken(token),
      password_reset_expires: new Date(Date.now() + expiresMinutes * 60 * 1000),
    },
    { id: user.id }
  );
  return token;
};

const buildSetPasswordUrl = (token) => {
  const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${clientUrl}/set-password?token=${token}`;
};

const parseUserAgent = (ua = '') => {
  if (!ua) return 'Unknown device';
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);
  let os = 'Unknown OS';
  let browser = 'Unknown browser';

  if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = 'Safari';
  else if (/Edg\//.test(ua)) browser = 'Edge';

  return `${browser} on ${os}${isMobile ? ' (Mobile)' : ''}`;
};

const createUserSession = async (userId, refreshToken, req) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || req.ip || '';
  const userAgent = req.headers['user-agent'] || '';
  const expiresInMs = msFromJwt(refreshToken) || 7 * 24 * 60 * 60 * 1000;

  return db.insert('sessions', {
    user_id: userId,
    refresh_token_hash: hashToken(refreshToken),
    ip,
    user_agent: userAgent,
    device_info: parseUserAgent(userAgent),
    last_active_at: new Date(),
    expires_at: new Date(Date.now() + expiresInMs),
  });
};

const msFromJwt = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (decoded?.exp) return Math.max(0, decoded.exp * 1000 - Date.now());
  } catch {
    // ignore
  }
  return null;
};

const toUserResponse = (user, extra = {}) => ({
  _id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  schoolId: user.school_id || null,
  phone: user.phone,
  address: user.address,
  status: user.status,
  avatar: user.avatar,
  lastLogin: user.last_login,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
  ...extra,
});

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Admin only
exports.register = catchAsync(async (req, res) => {
  const { name, email, password, role, phone, address, sendInvite, schoolId } = req.body;

  const isSuperAdmin = req.user.role === 'super_admin';
  const currentSchoolId = req.user.school_id || null;

  // Super admin can create school admins and assign them to any school.
  // School admins can only create staff/parent roles for their own school.
  const allowedRoles = isSuperAdmin
    ? ['admin']
    : ['teacher', 'accountant', 'librarian', 'parent', 'staff'];
  const requestedRole = role || 'teacher';

  if (!allowedRoles.includes(requestedRole)) {
    throw new ApiError(
      `You can only register the following roles: ${allowedRoles.join(', ')}. Student registrations must use the student workflow.`,
      400
    );
  }

  // Determine the school for the new user
  let targetSchoolId = currentSchoolId;
  if (isSuperAdmin && schoolId) {
    targetSchoolId = schoolId;
  }
  if (!isSuperAdmin && !currentSchoolId) {
    throw new ApiError('Your account is not associated with a school', 403);
  }
  if (!targetSchoolId && requestedRole !== 'super_admin') {
    throw new ApiError('School is required for this user', 400);
  }

  // Check if user already exists
  const existingUser = await db.findOne('users', { email });
  if (existingUser) {
    throw new ApiError('User with this email already exists', 400);
  }

  let user;

  if (requestedRole === 'parent') {
    // Parents are invited with a one-time set-password token
    const tempPassword = generateRandomPassword();
    const hashedTempPassword = await bcrypt.hash(tempPassword, 12);

    user = await db.insert('users', {
      name,
      email,
      password: hashedTempPassword,
      role: 'parent',
      school_id: targetSchoolId,
      phone: phone || '',
      address: address || '',
      status: 'pending',
    });

    // Create a Guardian profile for the parent
    const guardian = await db.insert('guardians', {
      school_id: targetSchoolId,
      first_name: name.split(' ')[0] || name,
      last_name: name.split(' ').slice(1).join(' ') || '',
      relationship: 'guardian',
      phone: phone || '',
      email,
      user_id: user.id,
    });

    const token = await generateSetPasswordToken(user);
    const setPasswordUrl = buildSetPasswordUrl(token);

    const sendCommunications = sendInvite !== false;
    if (sendCommunications) {
      try {
        await sendTemplatedEmail('parentInvite', user.email, {
          name: user.name,
          setPasswordUrl,
        });
      } catch (err) {
        console.error('Failed to send parent invite email:', err.message);
      }
      if (user.phone) {
        try {
          await sendSMS({
            to: user.phone,
            message: `Welcome to the school portal. Please check your email (${user.email}) to set your password.`,
          });
        } catch (err) {
          console.error('Failed to send parent invite SMS:', err.message);
        }
      }
    }

    const userResponse = {
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      status: user.status,
      guardian: guardian.id,
      createdAt: user.created_at,
    };

    return ApiResponse.success(
      res,
      { user: userResponse, setPasswordUrl: process.env.NODE_ENV === 'development' ? setPasswordUrl : undefined },
      'Parent invited successfully. A set-password link has been sent.',
      201
    );
  }

  assertStrongPassword(password);

  // Create staff / school admin user
  const hashedPassword = await bcrypt.hash(password, 12);
  user = await db.insert('users', {
    name,
    email,
    password: hashedPassword,
    role: requestedRole,
    school_id: targetSchoolId,
    phone: phone || '',
    address: address || '',
    status: 'active',
  });

  // Return user without password
  const userResponse = toUserResponse(user);

  return ApiResponse.success(res, { user: userResponse }, 'User registered successfully', 201);
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
  const user = await db.findOne('users', { email });
  if (!user) {
    throw new ApiError('Invalid credentials', 401);
  }

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError('Invalid credentials', 401);
  }

  // Check if user is active
  if (user.status === 'inactive') {
    throw new ApiError('Your account has been deactivated. Please contact admin.', 403);
  }
  if (user.status === 'pending') {
    throw new ApiError('Your account is pending approval. Please wait for admin approval.', 403);
  }

  // Non-super-admin users must belong to a school
  if (user.role !== 'super_admin' && !user.school_id) {
    throw new ApiError('Your account is not associated with any school. Please contact support.', 403);
  }

  // Generate tokens
  const refreshToken = generateRefreshToken(user.id);

  // Save only a hash of the refresh token so DB disclosure does not expose sessions
  await db.update(
    'users',
    {
      refresh_token: hashToken(refreshToken),
      last_login: new Date(),
    },
    { id: user.id }
  );

  // Create a tracked session
  const session = await createUserSession(user.id, refreshToken, req);
  const token = generateToken(user.id, session.id, user.school_id);

  setRefreshCookie(res, refreshToken);

  // Fetch school info for non-super-admins
  let school = null;
  if (user.school_id) {
    school = await db.findOne('schools', { id: user.school_id });
  }

  // Return user without password
  const userResponse = toUserResponse(user, {
    schoolName: school?.name || null,
    modules: school?.modules || { transport: false, hostel: false, library: true },
  });

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

  // Find active session
  const [session] = await db.raw(
    `SELECT * FROM sessions
     WHERE user_id = $1 AND refresh_token_hash = $2 AND is_revoked = false AND expires_at > CURRENT_TIMESTAMP`,
    [decoded.id, refreshTokenHash]
  );

  if (!session) {
    throw new ApiError('Invalid or expired session', 401);
  }

  // Find user
  const user = await db.findOne('users', { id: decoded.id });
  if (!user || user.refresh_token !== refreshTokenHash) {
    throw new ApiError('Invalid refresh token', 401);
  }

  if (user.status === 'inactive') {
    throw new ApiError('Your account has been deactivated', 403);
  }

  // Rotate refresh token on every refresh.
  const newRefreshToken = generateRefreshToken(user.id);
  const newRefreshTokenHash = hashToken(newRefreshToken);

  await db.update('users', { refresh_token: newRefreshTokenHash }, { id: user.id });

  // Update session with new token hash and activity
  await db.update(
    'sessions',
    {
      refresh_token_hash: newRefreshTokenHash,
      last_active_at: new Date(),
    },
    { id: session.id }
  );

  const newAccessToken = generateToken(user.id, session.id);
  setRefreshCookie(res, newRefreshToken);

  return ApiResponse.success(res, { token: newAccessToken }, 'Token refreshed successfully');
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = catchAsync(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body?.refreshToken;

  if (refreshToken) {
    try {
      const refreshTokenHash = hashToken(refreshToken);
      await db.update('sessions', { is_revoked: true }, { refresh_token_hash: refreshTokenHash });
    } catch {
      // Logout should stay idempotent even when the token is already invalid.
    }
  }

  clearRefreshCookie(res);

  // Clear refresh token from user if authenticated.
  if (req.user?.id) {
    try {
      await db.update('users', { refresh_token: '' }, { id: req.user.id });
    } catch {
      // Logout should stay idempotent.
    }
  } else if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      await db.update('users', { refresh_token: '' }, { id: decoded.id });
    } catch {
      // Logout should stay idempotent even when the token is already invalid.
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

  const user = await db.findOne('users', { email });
  if (!user) {
    return ApiResponse.success(res, null, 'If the email exists, a password reset link has been sent');
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash token and save to user
  await db.update(
    'users',
    {
      password_reset_token: hashToken(resetToken),
      password_reset_expires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    },
    { id: user.id }
  );

  // Create reset URL
  const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

  // Send email
  try {
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `Click <a href="${resetUrl}">here</a> to reset your password.`,
    });

    const data = process.env.NODE_ENV === 'production' ? null : { resetUrl };
    return ApiResponse.success(res, data, 'If the email exists, a password reset link has been sent');
  } catch (error) {
    await db.update(
      'users',
      {
        password_reset_token: '',
        password_reset_expires: null,
      },
      { id: user.id }
    );

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
  const [user] = await db.raw(
    `SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > CURRENT_TIMESTAMP`,
    [resetTokenHash]
  );

  if (!user) {
    throw new ApiError('Invalid or expired reset token', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await db.update(
    'users',
    {
      password: hashedPassword,
      refresh_token: '',
      password_reset_token: '',
      password_reset_expires: null,
      password_changed_at: new Date(),
    },
    { id: user.id }
  );

  return ApiResponse.success(res, null, 'Password reset successfully');
});

// @desc    Set password from invite token (one-time parent onboarding)
// @route   POST /api/v1/auth/set-password
// @access  Public
exports.setPassword = catchAsync(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    throw new ApiError('Token and password are required', 400);
  }

  assertStrongPassword(password);

  const tokenHash = hashToken(token);
  const [user] = await db.raw(
    `SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > CURRENT_TIMESTAMP`,
    [tokenHash]
  );

  if (!user) {
    throw new ApiError('Invalid or expired token', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const updatedUser = (
    await db.update(
      'users',
      {
        password: hashedPassword,
        status: 'active',
        refresh_token: '',
        password_reset_token: '',
        password_reset_expires: null,
        password_changed_at: new Date(),
      },
      { id: user.id }
    )
  )[0];

  // Issue session tokens
  const refreshToken = generateRefreshToken(updatedUser.id);
  await db.update('users', { refresh_token: hashToken(refreshToken) }, { id: updatedUser.id });
  const session = await createUserSession(updatedUser.id, refreshToken, req);
  const accessToken = generateToken(updatedUser.id, session.id, updatedUser.school_id);
  setRefreshCookie(res, refreshToken);

  const userResponse = toUserResponse(updatedUser);

  return ApiResponse.success(
    res,
    { user: userResponse, token: accessToken },
    'Password set successfully. You are now logged in.'
  );
});

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = catchAsync(async (req, res) => {
  const user = await db.findOne('users', { id: req.user.id });

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  const userResponse = toUserResponse(user);

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
  const user = await db.findOne('users', { id: req.user.id });

  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new ApiError('Current password is incorrect', 401);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await db.update(
    'users',
    {
      password: hashedPassword,
      refresh_token: '',
      password_changed_at: new Date(),
    },
    { id: user.id }
  );

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

  const user = (await db.update('users', updateData, { id: req.user.id }))[0];

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  return ApiResponse.success(res, { user: toUserResponse(user) }, 'User details updated successfully');
});

// @desc    List users (admin only)
// @route   GET /api/v1/auth/users
// @access  Admin
exports.getUsers = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { role, status, search, schoolId } = req.query;
  const isSuperAdmin = req.user.role === 'super_admin';

  const conditions = [];
  const params = [];

  // School scoping
  if (isSuperAdmin && schoolId) {
    params.push(schoolId);
    conditions.push(`school_id = $${params.length}`);
  } else if (!isSuperAdmin) {
    params.push(req.user.school_id);
    conditions.push(`school_id = $${params.length}`);
  }

  if (role) {
    params.push(role);
    conditions.push(`role = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) AS count FROM users ${whereClause}`;
  const [countRow] = await db.raw(countQuery, params);
  const total = parseInt(countRow.count, 10);

  const selectParams = [...params, limit, skip];
  const usersQuery = `
    SELECT id, name, email, role, school_id, phone, address, status, avatar, last_login, created_at, updated_at
    FROM users
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  const users = await db.raw(usersQuery, selectParams);

  const mappedUsers = users.map((u) => toUserResponse(u));

  return ApiResponse.paginated(res, mappedUsers, getPaginationMeta(page, limit, total), 'Users retrieved');
});
