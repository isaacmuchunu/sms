const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');

const ALLOWED_MODULES = ['transport', 'hostel', 'library'];

const toModuleRequestResponse = (request) => ({
  id: request.id,
  schoolId: request.school_id,
  requestedBy: request.requested_by,
  module: request.module,
  status: request.status,
  notes: request.notes,
  reviewedBy: request.reviewed_by,
  reviewedAt: request.reviewed_at,
  createdAt: request.created_at,
  updatedAt: request.updated_at,
});

const getSchoolModules = async (schoolId) => {
  const [school] = await db.raw('SELECT modules FROM schools WHERE id = $1 LIMIT 1', [schoolId]);
  if (!school) return null;
  return school.modules || { transport: false, hostel: false, library: true };
};

// @desc    List module requests for a school
// @route   GET /api/v1/schools/:id/module-requests
// @access  Super admin / school admin (own school)
exports.getModuleRequests = catchAsync(async (req, res) => {
  const { id } = req.params;
  const isSuperAdmin = req.user.role === 'super_admin';

  if (!isSuperAdmin && req.user.school_id !== id) {
    throw new ApiError('Access denied', 403);
  }

  const { page, limit, skip } = getPagination(req.query);
  const { status, module: moduleFilter } = req.query;

  const conditions = ['school_id = $1'];
  const params = [id];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  if (moduleFilter && ALLOWED_MODULES.includes(moduleFilter)) {
    params.push(moduleFilter);
    conditions.push(`module = $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const [countRow] = await db.raw(
    `SELECT COUNT(*) AS count FROM module_requests ${whereClause}`,
    params
  );
  const total = parseInt(countRow.count, 10);

  const selectParams = [...params, limit, skip];
  const requests = await db.raw(
    `SELECT * FROM module_requests ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    selectParams
  );

  return ApiResponse.paginated(
    res,
    requests.map(toModuleRequestResponse),
    getPaginationMeta(page, limit, total),
    'Module requests retrieved successfully'
  );
});

// @desc    Create a module activation request
// @route   POST /api/v1/schools/:id/module-requests
// @access  School admin (own school)
exports.createModuleRequest = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { module, notes } = req.body;

  if (req.user.school_id !== id) {
    throw new ApiError('Access denied', 403);
  }

  const modules = await getSchoolModules(id);
  if (!modules) {
    throw new ApiError('School not found', 404);
  }

  if (modules[module] === true) {
    throw new ApiError(`The ${module} module is already enabled for this school`, 400);
  }

  const existingPending = await db.findOne('module_requests', {
    school_id: id,
    module,
    status: 'pending',
  });

  if (existingPending) {
    throw new ApiError(`A pending request for ${module} already exists`, 409);
  }

  const request = await db.insert('module_requests', {
    school_id: id,
    requested_by: req.user.id,
    module,
    status: 'pending',
    notes: notes || '',
  });

  return ApiResponse.success(
    res,
    { request: toModuleRequestResponse(request) },
    'Module request submitted successfully',
    201
  );
});

// @desc    Approve a module request and enable the module
// @route   PATCH /api/v1/module-requests/:id/approve
// @access  Super admin
exports.approveModuleRequest = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body || {};

  const [request] = await db.raw('SELECT * FROM module_requests WHERE id = $1 LIMIT 1', [id]);
  if (!request) {
    throw new ApiError('Module request not found', 404);
  }

  if (request.status !== 'pending') {
    throw new ApiError(`Request has already been ${request.status}`, 400);
  }

  const [school] = await db.raw('SELECT modules FROM schools WHERE id = $1 LIMIT 1', [request.school_id]);
  if (!school) {
    throw new ApiError('School not found', 404);
  }

  const currentModules = school.modules || { transport: false, hostel: false, library: true };
  const updatedModules = { ...currentModules, [request.module]: true };

  await db.update(
    'module_requests',
    {
      status: 'approved',
      reviewed_by: req.user.id,
      reviewed_at: new Date(),
      notes: notes !== undefined ? notes : request.notes || '',
    },
    { id }
  );

  await db.update('schools', { modules: updatedModules }, { id: request.school_id });

  const [updatedRequest] = await db.raw('SELECT * FROM module_requests WHERE id = $1 LIMIT 1', [id]);

  return ApiResponse.success(
    res,
    { request: toModuleRequestResponse(updatedRequest) },
    `${request.module} module approved and activated`
  );
});

// @desc    Reject a module request
// @route   PATCH /api/v1/module-requests/:id/reject
// @access  Super admin
exports.rejectModuleRequest = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body || {};

  const [request] = await db.raw('SELECT * FROM module_requests WHERE id = $1 LIMIT 1', [id]);
  if (!request) {
    throw new ApiError('Module request not found', 404);
  }

  if (request.status !== 'pending') {
    throw new ApiError(`Request has already been ${request.status}`, 400);
  }

  await db.update(
    'module_requests',
    {
      status: 'rejected',
      reviewed_by: req.user.id,
      reviewed_at: new Date(),
      notes: notes !== undefined ? notes : request.notes || '',
    },
    { id }
  );

  const [updatedRequest] = await db.raw('SELECT * FROM module_requests WHERE id = $1 LIMIT 1', [id]);

  return ApiResponse.success(
    res,
    { request: toModuleRequestResponse(updatedRequest) },
    `${request.module} module request rejected`
  );
});
