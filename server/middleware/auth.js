const jwt = require('jsonwebtoken');
const db = require('../db');
const ApiError = require('../utils/ApiError');

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Authenticate user via JWT token from Authorization header.
 * Attaches the user object to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new ApiError('Not authorized to access this route', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.id || !UUID_REGEX.test(decoded.id)) {
      return next(new ApiError('User not found', 401));
    }

    const [user] = await db.raw(
      'SELECT * FROM users WHERE id = $1 LIMIT 1',
      [decoded.id]
    );

    if (!user) {
      return next(new ApiError('User not found', 401));
    }

    if (user.status === 'inactive') {
      return next(new ApiError('Your account has been deactivated', 403));
    }

    // Attach school context. If the user is not super_admin, require a school.
    if (decoded.schoolId) {
      user.school_id = decoded.schoolId;
    }
    if (user.role !== 'super_admin' && !user.school_id) {
      return next(new ApiError('Your account is not associated with any school', 403));
    }

    if (
      user.password_changed_at &&
      decoded.iat &&
      new Date(user.password_changed_at).getTime() / 1000 > decoded.iat
    ) {
      return next(new ApiError('Password was changed recently. Please log in again.', 401));
    }

    // Tokens issued after session-management was introduced contain a sessionId.
    // Validate that the session is still active and not expired.
    if (decoded.sessionId) {
      if (!UUID_REGEX.test(decoded.sessionId)) {
        return next(new ApiError('Session has expired or been revoked. Please log in again.', 401));
      }

      const session = await db.findOne('sessions', { id: decoded.sessionId });
      if (!session || session.is_revoked || new Date(session.expires_at) < new Date()) {
        return next(new ApiError('Session has expired or been revoked. Please log in again.', 401));
      }

      await db.update(
        'sessions',
        { last_active_at: new Date() },
        { id: decoded.sessionId }
      );
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
 * super_admin is implicitly allowed access to all routes.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError('Authentication required', 401));
    }

    if (req.user.role === 'super_admin' || roles.includes(req.user.role)) {
      return next();
    }

    return next(
      new ApiError(
        `Access denied. Required role(s): ${roles.join(', ')}`,
        403
      )
    );
  };
};

/**
 * Middleware factory that returns the authorize middleware for the given roles.
 * Useful for route files that destructure `requireRole`.
 */
const requireRole = (...roles) => authorize(...roles);

/**
 * Return a school_id filter object for the current user.
 * super_admin can optionally scope to req.query.schoolId.
 */
const getSchoolFilter = (req) => {
  if (req.user.role === 'super_admin') {
    return req.query?.schoolId ? { school_id: req.query.schoolId } : {};
  }
  return { school_id: req.user.school_id };
};

/**
 * Return a raw SQL WHERE clause and params for school scoping.
 */
const scopeBySchool = (req, existingParamCount = 0) => {
  const isSuperAdmin = req.user.role === 'super_admin';
  const requestedSchoolId = req.query?.schoolId;

  if (isSuperAdmin) {
    if (requestedSchoolId) {
      return {
        clause: `school_id = $${existingParamCount + 1}`,
        params: [requestedSchoolId],
        nextIndex: existingParamCount + 2,
      };
    }
    return { clause: '1=1', params: [], nextIndex: existingParamCount + 1 };
  }

  return {
    clause: `school_id = $${existingParamCount + 1}`,
    params: [req.user.school_id],
    nextIndex: existingParamCount + 2,
  };
};

const requireModule = (moduleName) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next(new ApiError('Authentication required', 401));
    }
    const schoolId = req.user.school_id;
    if (!schoolId) {
      return next(new ApiError('School context required', 403));
    }
    const [school] = await db.raw('SELECT modules FROM schools WHERE id = $1 LIMIT 1', [schoolId]);
    if (!school) {
      return next(new ApiError('School not found', 404));
    }
    const modules = school.modules || { transport: false, hostel: false, library: true };
    if (modules[moduleName] === false) {
      return next(new ApiError(`The ${moduleName} module is disabled for this school`, 403));
    }
    next();
  };
};

module.exports = { authenticate, authorize, requireRole, getSchoolFilter, scopeBySchool, requireModule };
