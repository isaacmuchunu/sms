const db = require('../db');
const bcrypt = require('bcryptjs');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');

const hashPassword = async (password) => bcrypt.hash(password, 12);
const generateRandomPassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const toSchoolResponse = (school) => ({
  id: school.id,
  name: school.name,
  address: school.address,
  phone: school.phone,
  email: school.email,
  website: school.website,
  affiliationNo: school.affiliation_no,
  board: school.board,
  establishedYear: school.established_year,
  principalName: school.principal_name,
  status: school.status,
  modules: school.modules || { transport: false, hostel: false, library: true },
  createdAt: school.created_at,
  updatedAt: school.updated_at,
});

// @desc    List all schools
// @route   GET /api/v1/schools
// @access  Super admin
exports.getSchools = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { search, status } = req.query;

  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR affiliation_no ILIKE $${params.length})`);
  }
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRow] = await db.raw(
    `SELECT COUNT(*) AS count FROM schools ${whereClause}`,
    params
  );
  const total = parseInt(countRow.count, 10);

  const selectParams = [...params, limit, skip];
  const schools = await db.raw(
    `SELECT * FROM schools ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    selectParams
  );

  return ApiResponse.paginated(
    res,
    schools.map(toSchoolResponse),
    getPaginationMeta(page, limit, total),
    'Schools retrieved successfully'
  );
});

// @desc    Create a new school and optionally its first admin
// @route   POST /api/v1/schools
// @access  Super admin
exports.createSchool = catchAsync(async (req, res) => {
  const {
    name,
    address,
    phone,
    email,
    website,
    affiliationNo,
    board,
    establishedYear,
    principalName,
    adminName,
    adminEmail,
    adminPassword,
  } = req.body;

  if (!name) {
    throw new ApiError('School name is required', 400);
  }

  const schoolData = {
    name: name.trim(),
    address: address || '',
    phone: phone || '',
    email: email || '',
    website: website || '',
    affiliation_no: affiliationNo || '',
    board: board || '',
    established_year: establishedYear ? parseInt(establishedYear, 10) : null,
    principal_name: principalName || '',
    status: 'active',
    modules: { transport: false, hostel: false, library: true },
  };

  const school = await db.insert('schools', schoolData);

  let admin = null;
  let adminPlainPassword = null;

  if (adminEmail) {
    const existing = await db.findOne('users', { email: adminEmail.toLowerCase() });
    if (existing) {
      throw new ApiError('A user with the admin email already exists', 409);
    }

    adminPlainPassword = adminPassword || generateRandomPassword();
    admin = await db.insert('users', {
      name: adminName || 'School Admin',
      email: adminEmail.toLowerCase(),
      password: await hashPassword(adminPlainPassword),
      role: 'admin',
      school_id: school.id,
      status: 'active',
    });
  }

  return ApiResponse.success(
    res,
    {
      school: toSchoolResponse(school),
      admin: admin
        ? {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            schoolId: admin.school_id,
            plainPassword: adminPassword ? undefined : adminPlainPassword,
          }
        : null,
    },
    'School created successfully',
    201
  );
});

// @desc    Get school details
// @route   GET /api/v1/schools/:id
// @access  Super admin / school admin (own school)
exports.getSchool = catchAsync(async (req, res) => {
  const { id } = req.params;
  const isSuperAdmin = req.user.role === 'super_admin';

  if (!isSuperAdmin && req.user.school_id !== id) {
    throw new ApiError('Access denied', 403);
  }

  const [school] = await db.raw('SELECT * FROM schools WHERE id = $1 LIMIT 1', [id]);
  if (!school) {
    throw new ApiError('School not found', 404);
  }

  return ApiResponse.success(res, { school: toSchoolResponse(school) }, 'School details retrieved');
});

// @desc    Update school
// @route   PUT /api/v1/schools/:id
// @access  Super admin / school admin (own school)
exports.updateSchool = catchAsync(async (req, res) => {
  const { id } = req.params;
  const isSuperAdmin = req.user.role === 'super_admin';

  if (!isSuperAdmin && req.user.school_id !== id) {
    throw new ApiError('Access denied', 403);
  }

  const school = await db.findOne('schools', { id });
  if (!school) {
    throw new ApiError('School not found', 404);
  }

  const allowed = [
    'name',
    'address',
    'phone',
    'email',
    'website',
    'affiliation_no',
    'board',
    'established_year',
    'principal_name',
    'status',
  ];
  const data = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) data[key] = req.body[key];
    if (req.body[key] === '') data[key] = '';
  });

  // Map camelCase body keys
  const camelMap = {
    affiliationNo: 'affiliation_no',
    establishedYear: 'established_year',
    principalName: 'principal_name',
  };
  Object.entries(camelMap).forEach(([camel, snake]) => {
    if (req.body[camel] !== undefined) data[snake] = req.body[camel];
  });

  if (Object.keys(data).length === 0) {
    return ApiResponse.success(res, { school: toSchoolResponse(school) }, 'No changes made');
  }

  const [updated] = await db.update('schools', data, { id });
  return ApiResponse.success(res, { school: toSchoolResponse(updated) }, 'School updated successfully');
});

// @desc    Update school module toggles
// @route   PATCH /api/v1/schools/:id/modules
// @access  Super admin
exports.updateSchoolModules = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { modules } = req.body;

  const school = await db.findOne('schools', { id });
  if (!school) {
    throw new ApiError('School not found', 404);
  }

  if (!modules || typeof modules !== 'object') {
    throw new ApiError('Modules object is required', 400);
  }

  const allowedKeys = ['transport', 'hostel', 'library'];
  const current = school.modules || { transport: false, hostel: false, library: true };
  const updatedModules = { ...current };

  allowedKeys.forEach((key) => {
    if (modules[key] !== undefined) {
      updatedModules[key] = Boolean(modules[key]);
    }
  });

  const [updated] = await db.update('schools', { modules: updatedModules }, { id });
  return ApiResponse.success(res, { school: toSchoolResponse(updated) }, 'School modules updated successfully');
});

// @desc    Delete/deactivate school
// @route   DELETE /api/v1/schools/:id
// @access  Super admin
exports.deleteSchool = catchAsync(async (req, res) => {
  const { id } = req.params;

  const school = await db.findOne('schools', { id });
  if (!school) {
    throw new ApiError('School not found', 404);
  }

  // Soft delete by marking inactive. Hard delete cascades too much data.
  const [updated] = await db.update('schools', { status: 'inactive' }, { id });
  return ApiResponse.success(res, { school: toSchoolResponse(updated) }, 'School deactivated successfully');
});

// @desc    Add an admin to a school
// @route   POST /api/v1/schools/:id/admins
// @access  Super admin
exports.addSchoolAdmin = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;

  const school = await db.findOne('schools', { id });
  if (!school) {
    throw new ApiError('School not found', 404);
  }

  if (!name || !email) {
    throw new ApiError('Name and email are required', 400);
  }

  const existing = await db.findOne('users', { email: email.toLowerCase() });
  if (existing) {
    throw new ApiError('A user with this email already exists', 409);
  }

  const plainPassword = password || generateRandomPassword();
  const admin = await db.insert('users', {
    name,
    email: email.toLowerCase(),
    password: await hashPassword(plainPassword),
    role: 'admin',
    school_id: id,
    status: 'active',
  });

  return ApiResponse.success(
    res,
    {
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        schoolId: admin.school_id,
        plainPassword: password ? undefined : plainPassword,
      },
    },
    'School admin added successfully',
    201
  );
});

// @desc    List users of a school
// @route   GET /api/v1/schools/:id/users
// @access  Super admin / school admin (own school)
exports.getSchoolUsers = catchAsync(async (req, res) => {
  const { id } = req.params;
  const isSuperAdmin = req.user.role === 'super_admin';

  if (!isSuperAdmin && req.user.school_id !== id) {
    throw new ApiError('Access denied', 403);
  }

  const { page, limit, skip } = getPagination(req.query);
  const { role, search } = req.query;

  const conditions = ['school_id = $1'];
  const params = [id];

  if (role) {
    params.push(role);
    conditions.push(`role = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const [countRow] = await db.raw(
    `SELECT COUNT(*) AS count FROM users ${whereClause}`,
    params
  );
  const total = parseInt(countRow.count, 10);

  const selectParams = [...params, limit, skip];
  const users = await db.raw(
    `SELECT id, name, email, role, school_id, phone, status, last_login, created_at FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    selectParams
  );

  const mappedUsers = users.map((u) => ({
    _id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    schoolId: u.school_id,
    phone: u.phone,
    status: u.status,
    lastLogin: u.last_login,
    createdAt: u.created_at,
  }));

  return ApiResponse.paginated(res, mappedUsers, getPaginationMeta(page, limit, total), 'School users retrieved');
});
