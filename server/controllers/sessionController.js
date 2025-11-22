const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const crypto = require('crypto');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// @desc    Get current user's active sessions
// @route   GET /api/v1/sessions/me
// @access  Private
exports.getMySessions = catchAsync(async (req, res) => {
  const sessions = await db.raw(
    `SELECT * FROM sessions
     WHERE user_id = $1 AND is_revoked = false AND expires_at > CURRENT_TIMESTAMP
     ORDER BY last_active_at DESC`,
    [req.user.id]
  );

  // Mark the current session based on the refresh cookie
  const currentRefreshToken = req.cookies.refreshToken || req.body?.refreshToken;
  const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;

  const data = sessions.map((session) => ({
    _id: session.id,
    deviceInfo: session.device_info,
    ip: session.ip,
    lastActiveAt: session.last_active_at,
    createdAt: session.created_at,
    expiresAt: session.expires_at,
    isCurrent: currentHash ? session.refresh_token_hash === currentHash : false,
  }));

  return ApiResponse.success(res, { sessions: data }, 'Sessions retrieved successfully');
});

// @desc    Revoke a specific session
// @route   DELETE /api/v1/sessions/:id
// @access  Private
exports.revokeSession = catchAsync(async (req, res) => {
  const result = await db.update(
    'sessions',
    { is_revoked: true },
    { id: req.params.id, user_id: req.user.id }
  );

  if (!result || result.length === 0) {
    throw new ApiError('Session not found', 404);
  }

  return ApiResponse.success(res, null, 'Session revoked successfully');
});

// @desc    Revoke all other sessions for the current user
// @route   DELETE /api/v1/sessions/others
// @access  Private
exports.revokeOtherSessions = catchAsync(async (req, res) => {
  const currentRefreshToken = req.cookies.refreshToken || req.body?.refreshToken;
  const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;

  let query;
  let params;

  if (currentHash) {
    query = `UPDATE sessions
             SET is_revoked = true
             WHERE user_id = $1 AND is_revoked = false AND refresh_token_hash <> $2
             RETURNING id`;
    params = [req.user.id, currentHash];
  } else {
    query = `UPDATE sessions
             SET is_revoked = true
             WHERE user_id = $1 AND is_revoked = false
             RETURNING id`;
    params = [req.user.id];
  }

  const result = await db.raw(query, params);

  return ApiResponse.success(
    res,
    { revokedCount: result.length },
    'Other sessions revoked successfully'
  );
});

// @desc    Revoke all sessions for a user (admin utility)
// @route   DELETE /api/v1/sessions/user/:userId
// @access  Admin/Super Admin
exports.revokeUserSessions = catchAsync(async (req, res) => {
  const user = await db.findOne('users', { id: req.params.userId });
  if (!user) {
    throw new ApiError('User not found', 404);
  }

  await db.raw(
    `UPDATE sessions SET is_revoked = true WHERE user_id = $1 AND is_revoked = false`,
    [req.params.userId]
  );

  await db.update('users', { refresh_token: null }, { id: req.params.userId });

  return ApiResponse.success(res, null, 'All user sessions revoked successfully');
});
