const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { getSchoolFilter } = require('../middleware/auth');
const { buildOrderBy } = require('../utils/sort');

const ACADEMIC_YEAR_SORT_ALLOWLIST = {
  startDate: 'start_date',
  endDate: 'end_date',
  name: 'name',
  status: 'status',
  isCurrent: 'is_current',
  createdAt: 'created_at',
};

// @desc    List academic years
// @route   GET /api/v1/academic-years
// @access  Admin, Principal, Teacher, Student, Parent
exports.getAcademicYears = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, isCurrent, sort = '-startDate' } = req.query;

  const where = getSchoolFilter(req);
  if (status) where.status = status;
  if (isCurrent !== undefined) where.is_current = isCurrent === true || isCurrent === 'true';

  const [academicYears, total] = await Promise.all([
    db.findMany('academic_years', {
      where,
      orderBy: buildOrderBy(sort, undefined, ACADEMIC_YEAR_SORT_ALLOWLIST, 'start_date DESC'),
      limit,
      offset: skip,
    }),
    db.count('academic_years', where),
  ]);

  const meta = getPaginationMeta(page, limit, total);
  return ApiResponse.paginated(
    res,
    academicYears,
    meta,
    'Academic years retrieved successfully'
  );
});

// @desc    Get current academic year
// @route   GET /api/v1/academic-years/current
// @access  Admin, Principal, Teacher, Student, Parent
exports.getCurrentAcademicYear = catchAsync(async (req, res) => {
  const academicYear = await db.findOne('academic_years', {
    ...getSchoolFilter(req),
    is_current: true,
  });

  if (!academicYear) {
    throw new ApiError('No current academic year found', 404);
  }

  return ApiResponse.success(
    res,
    { academicYear },
    'Current academic year retrieved successfully'
  );
});

// @desc    Get a single academic year
// @route   GET /api/v1/academic-years/:id
// @access  Admin, Principal, Teacher, Student, Parent
exports.getAcademicYear = catchAsync(async (req, res) => {
  const academicYear = await db.findOne('academic_years', { id: req.params.id });

  if (!academicYear) {
    throw new ApiError('Academic year not found', 404);
  }

  if (req.user.role !== 'super_admin' && academicYear.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  return ApiResponse.success(
    res,
    { academicYear },
    'Academic year retrieved successfully'
  );
});
