const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getSchoolFilter } = require('../middleware/auth');

const defaultGrades = [
  { grade: 'A+', minPercent: 90, maxPercent: 100, points: 10, remarks: 'Outstanding' },
  { grade: 'A', minPercent: 80, maxPercent: 89, points: 9, remarks: 'Excellent' },
  { grade: 'B+', minPercent: 70, maxPercent: 79, points: 8, remarks: 'Very Good' },
  { grade: 'B', minPercent: 60, maxPercent: 69, points: 7, remarks: 'Good' },
  { grade: 'C+', minPercent: 50, maxPercent: 59, points: 6, remarks: 'Satisfactory' },
  { grade: 'C', minPercent: 40, maxPercent: 49, points: 5, remarks: 'Average' },
  { grade: 'D', minPercent: 33, maxPercent: 39, points: 4, remarks: 'Below Average' },
  { grade: 'F', minPercent: 0, maxPercent: 32, points: 0, remarks: 'Fail' },
];

const defaultNotificationSettings = {
  emailAnnouncements: true,
  smsAlerts: false,
  pushNotifications: true,
  feeReminders: true,
  attendanceAlerts: true,
  examResults: true,
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

const mapCamelToSnake = (update) => {
  const camelMap = {
    affiliationNo: 'affiliation_no',
    establishedYear: 'established_year',
    principalName: 'principal_name',
  };
  const mapped = {};
  Object.entries(update).forEach(([key, value]) => {
    mapped[camelMap[key] || key] = value;
  });
  return mapped;
};

const getSettingsSchoolId = (req) => {
  if (req.user.role === 'super_admin') {
    return req.query?.schoolId || null;
  }
  return req.user.school_id || null;
};

// ---------- School ----------

exports.getSchool = catchAsync(async (req, res) => {
  let school;
  if (req.user.role === 'super_admin') {
    if (!req.query.schoolId) {
      throw new ApiError('schoolId query parameter is required for super admin', 400);
    }
    [school] = await db.raw('SELECT * FROM schools WHERE id = $1 LIMIT 1', [req.query.schoolId]);
  } else {
    if (!req.user.school_id) {
      throw new ApiError('Your account is not associated with a school', 403);
    }
    [school] = await db.raw('SELECT * FROM schools WHERE id = $1 LIMIT 1', [req.user.school_id]);
  }

  if (!school) {
    throw new ApiError('School not found', 404);
  }
  return ApiResponse.success(res, { school: toSchoolResponse(school) }, 'School details retrieved successfully');
});

exports.updateSchool = catchAsync(async (req, res) => {
  const update = mapCamelToSnake(req.body);
  let school;

  if (req.user.role === 'super_admin') {
    if (!req.query.schoolId) {
      throw new ApiError('schoolId query parameter is required for super admin', 400);
    }
    [school] = await db.raw('SELECT * FROM schools WHERE id = $1 LIMIT 1', [req.query.schoolId]);
  } else {
    if (!req.user.school_id) {
      throw new ApiError('Your account is not associated with a school', 403);
    }
    [school] = await db.raw('SELECT * FROM schools WHERE id = $1 LIMIT 1', [req.user.school_id]);
  }

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
    if (update[key] !== undefined) data[key] = update[key];
  });

  if (Object.keys(data).length > 0) {
    [school] = await db.update('schools', data, { id: school.id });
  }
  return ApiResponse.success(res, { school: toSchoolResponse(school) }, 'School details updated successfully');
});

// ---------- Academic Years ----------

async function getAcademicYearWithTerms(yearId) {
  if (!yearId) return null;
  const terms = await db.findMany('academic_year_terms', {
    where: { academic_year_id: yearId },
    orderBy: 'start_date ASC',
  });
  const year = await db.findOne('academic_years', { id: yearId });
  if (!year) return null;
  return { ...year, terms };
}

exports.getAcademicYears = catchAsync(async (req, res) => {
  const years = await db.findMany('academic_years', {
    where: getSchoolFilter(req),
    orderBy: 'start_date DESC',
  });
  const yearsWithTerms = await Promise.all(
    years.map((year) => getAcademicYearWithTerms(year.id))
  );
  return ApiResponse.success(
    res,
    { academicYears: yearsWithTerms },
    'Academic years retrieved successfully'
  );
});

exports.createAcademicYear = catchAsync(async (req, res) => {
  const { name, startDate, endDate, terms, isCurrent, lateThresholdMinutes, promotionCriteria } = req.body;
  const schoolId = getSettingsSchoolId(req);
  if (!schoolId) {
    throw new ApiError('School context required. Pass schoolId as a query parameter.', 400);
  }

  const existing = await db.findOne('academic_years', {
    name: name.trim(),
    school_id: schoolId,
  });
  if (existing) {
    throw new ApiError('Academic year with this name already exists', 409);
  }

  if (new Date(startDate) >= new Date(endDate)) {
    throw new ApiError('Start date must be before end date', 400);
  }

  if (Array.isArray(terms) && terms.length > 0) {
    terms.forEach((term) => {
      if (new Date(term.startDate) >= new Date(term.endDate)) {
        throw new ApiError(`Term ${term.name} start date must be before end date`, 400);
      }
      if (new Date(term.startDate) < new Date(startDate) || new Date(term.endDate) > new Date(endDate)) {
        throw new ApiError(
          `Term ${term.name} dates must be within the academic year range`,
          400
        );
      }
    });
  }

  if (isCurrent) {
    await db.raw('UPDATE academic_years SET is_current = false WHERE school_id = $1', [schoolId]);
  }

  const promotionCriteriaData = promotionCriteria || {
    minAggregatePercentage: 40,
    maxFailingSubjects: 2,
    minAttendancePercentage: 75,
  };

  const year = await db.insert('academic_years', {
    name: name.trim(),
    start_date: startDate,
    end_date: endDate,
    is_current: !!isCurrent,
    school_id: schoolId,
    late_threshold_minutes: lateThresholdMinutes ?? 10,
    promotion_criteria: promotionCriteriaData,
  });

  if (Array.isArray(terms) && terms.length > 0) {
    await Promise.all(
      terms.map((term) =>
        db.insert('academic_year_terms', {
          academic_year_id: year.id,
          name: term.name,
          start_date: term.startDate || term.start_date,
          end_date: term.endDate || term.end_date,
        })
      )
    );
  }

  const yearWithTerms = await getAcademicYearWithTerms(year.id);
  return ApiResponse.success(
    res,
    { academicYear: yearWithTerms },
    'Academic year created successfully',
    201
  );
});

exports.updateAcademicYear = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, startDate, endDate, terms, isCurrent, status, lateThresholdMinutes, promotionCriteria } = req.body;

  const year = await db.findOne('academic_years', { id });
  if (!year) {
    throw new ApiError('Academic year not found', 404);
  }

  if (req.user.role !== 'super_admin' && year.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const effectiveStartDate = startDate || year.start_date;
  const effectiveEndDate = endDate || year.end_date;

  if (new Date(effectiveStartDate) >= new Date(effectiveEndDate)) {
    throw new ApiError('Start date must be before end date', 400);
  }

  if (name && name.trim() !== year.name) {
    const existing = await db.raw(
      'SELECT * FROM academic_years WHERE name = $1 AND school_id = $2 AND id != $3 LIMIT 1',
      [name.trim(), year.school_id, id]
    );
    if (existing && existing.length > 0) {
      throw new ApiError('Academic year with this name already exists', 409);
    }
  }

  if (Array.isArray(terms) && terms.length > 0) {
    terms.forEach((term) => {
      if (new Date(term.startDate) >= new Date(term.endDate)) {
        throw new ApiError(`Term ${term.name} start date must be before end date`, 400);
      }
      if (
        new Date(term.startDate) < new Date(effectiveStartDate) ||
        new Date(term.endDate) > new Date(effectiveEndDate)
      ) {
        throw new ApiError(
          `Term ${term.name} dates must be within the academic year range`,
          400
        );
      }
    });
  }

  const data = {};
  if (name) data.name = name.trim();
  if (startDate) data.start_date = startDate;
  if (endDate) data.end_date = endDate;
  if (status) data.status = status;
  if (lateThresholdMinutes !== undefined) data.late_threshold_minutes = lateThresholdMinutes;
  if (promotionCriteria !== undefined) data.promotion_criteria = promotionCriteria;

  if (isCurrent) {
    await db.raw('UPDATE academic_years SET is_current = false WHERE school_id = $1 AND id != $2', [
      year.school_id,
      id,
    ]);
    data.is_current = true;
  }

  if (Object.keys(data).length > 0) {
    await db.update('academic_years', data, { id });
  }

  if (Array.isArray(terms)) {
    await db.raw('DELETE FROM academic_year_terms WHERE academic_year_id = $1', [id]);
    await Promise.all(
      terms.map((term) =>
        db.insert('academic_year_terms', {
          academic_year_id: id,
          name: term.name,
          start_date: term.startDate || term.start_date,
          end_date: term.endDate || term.end_date,
        })
      )
    );
  }

  const yearWithTerms = await getAcademicYearWithTerms(id);
  return ApiResponse.success(
    res,
    { academicYear: yearWithTerms },
    'Academic year updated successfully'
  );
});

const getAcademicYearDependencies = async (yearId) => {
  const checks = [
    { table: 'students', column: 'academic_year_id', label: 'students' },
    { table: 'classes', column: 'academic_year_id', label: 'classes' },
    { table: 'fee_structures', column: 'academic_year_id', label: 'fee structures' },
    { table: 'exams', column: 'academic_year_id', label: 'exams' },
    { table: 'exam_schedules', column: 'academic_year_id', label: 'exam schedules' },
    { table: 'marks', column: 'academic_year_id', label: 'marks' },
    { table: 'attendance', column: 'academic_year_id', label: 'attendance records' },
  ];

  const dependencies = [];
  for (const check of checks) {
    const [row] = await db.raw(
      `SELECT COUNT(*) AS count FROM ${check.table} WHERE ${check.column} = $1`,
      [yearId]
    );
    if (parseInt(row.count, 10) > 0) {
      dependencies.push(`${check.label} (${row.count})`);
    }
  }
  return dependencies;
};

exports.deleteAcademicYear = catchAsync(async (req, res) => {
  const { id } = req.params;
  const year = await db.findOne('academic_years', { id });
  if (!year) {
    throw new ApiError('Academic year not found', 404);
  }

  if (req.user.role !== 'super_admin' && year.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const dependencies = await getAcademicYearDependencies(id);
  if (dependencies.length > 0) {
    throw new ApiError(
      `Cannot delete academic year because it is linked to: ${dependencies.join(', ')}. Please reassign or remove these records first.`,
      409
    );
  }

  await db.raw('DELETE FROM academic_year_terms WHERE academic_year_id = $1', [id]);
  await db.delete('academic_years', { id });
  return ApiResponse.success(res, null, 'Academic year deleted successfully');
});

exports.setCurrentAcademicYear = catchAsync(async (req, res) => {
  const { id } = req.params;

  const year = await db.findOne('academic_years', { id });
  if (!year) {
    throw new ApiError('Academic year not found', 404);
  }

  if (req.user.role !== 'super_admin' && year.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  await db.raw('UPDATE academic_years SET is_current = false WHERE school_id = $1 AND id != $2', [
    year.school_id,
    id,
  ]);
  await db.update('academic_years', { is_current: true }, { id });
  const yearWithTerms = await getAcademicYearWithTerms(id);
  return ApiResponse.success(
    res,
    { academicYear: yearWithTerms },
    'Current academic year updated successfully'
  );
});

// ---------- Grading Scale ----------

async function getDefaultGradingScaleWithGrades(schoolId) {
  const scale = await db.raw(
    'SELECT * FROM grading_scales WHERE is_default = true AND school_id = $1 ORDER BY created_at ASC LIMIT 1',
    [schoolId]
  );
  if (!scale || scale.length === 0) return null;
  const grades = await db.findMany('grading_scale_grades', {
    where: { grading_scale_id: scale[0].id },
    orderBy: 'min_percent DESC',
  });
  return { ...scale[0], grades };
}

exports.getGradingScale = catchAsync(async (req, res) => {
  const schoolId = getSettingsSchoolId(req);
  if (!schoolId) {
    throw new ApiError('School context required. Pass schoolId as a query parameter.', 400);
  }
  let scale = await getDefaultGradingScaleWithGrades(schoolId);
  if (!scale) {
    const created = await db.insert('grading_scales', {
      name: 'Default',
      is_default: true,
      school_id: schoolId,
    });
    await Promise.all(
      defaultGrades.map((g) =>
        db.insert('grading_scale_grades', {
          grading_scale_id: created.id,
          grade: g.grade,
          min_percent: g.minPercent,
          max_percent: g.maxPercent,
          points: g.points,
          remarks: g.remarks,
        })
      )
    );
    scale = await getDefaultGradingScaleWithGrades(schoolId);
  }
  return ApiResponse.success(res, { gradingScale: scale }, 'Grading scale retrieved successfully');
});

exports.updateGradingScale = catchAsync(async (req, res) => {
  const { grades } = req.body;
  if (!Array.isArray(grades) || grades.length === 0) {
    throw new ApiError('Grades array is required', 400);
  }

  const schoolId = getSettingsSchoolId(req);
  if (!schoolId) {
    throw new ApiError('School context required. Pass schoolId as a query parameter.', 400);
  }

  // Validate each grade range
  grades.forEach((g) => {
    if (g.minPercent > g.maxPercent) {
      throw new ApiError(`Grade ${g.grade} has minPercent greater than maxPercent`, 400);
    }
  });

  // Validate no overlapping ranges
  const sorted = [...grades].sort((a, b) => b.minPercent - a.minPercent);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].maxPercent >= sorted[i - 1].minPercent) {
      throw new ApiError(
        `Grading ranges overlap between ${sorted[i - 1].grade} and ${sorted[i].grade}`,
        400
      );
    }
  }

  let scale = await getDefaultGradingScaleWithGrades(schoolId);
  if (!scale) {
    const created = await db.insert('grading_scales', {
      name: 'Default',
      is_default: true,
      school_id: schoolId,
    });
    await Promise.all(
      grades.map((g) =>
        db.insert('grading_scale_grades', {
          grading_scale_id: created.id,
          grade: g.grade,
          min_percent: g.minPercent,
          max_percent: g.maxPercent,
          points: g.points,
          remarks: g.remarks,
        })
      )
    );
  } else {
    await db.raw('DELETE FROM grading_scale_grades WHERE grading_scale_id = $1', [scale.id]);
    await Promise.all(
      grades.map((g) =>
        db.insert('grading_scale_grades', {
          grading_scale_id: scale.id,
          grade: g.grade,
          min_percent: g.minPercent,
          max_percent: g.maxPercent,
          points: g.points,
          remarks: g.remarks,
        })
      )
    );
  }

  scale = await getDefaultGradingScaleWithGrades(schoolId);
  return ApiResponse.success(res, { gradingScale: scale }, 'Grading scale updated successfully');
});

// ---------- Notifications ----------

exports.getNotificationSettings = catchAsync(async (req, res) => {
  const user = await db.findOne('users', { id: req.user.id });
  if (!user) {
    throw new ApiError('User not found', 404);
  }
  const prefs = user.preferences?.notifications || {};
  return ApiResponse.success(
    res,
    {
      notifications: {
        emailAnnouncements: prefs.emailAnnouncements ?? true,
        smsAlerts: prefs.smsAlerts ?? false,
        pushNotifications: prefs.pushNotifications ?? true,
        feeReminders: prefs.feeReminders ?? true,
        attendanceAlerts: prefs.attendanceAlerts ?? true,
        examResults: prefs.examResults ?? true,
      },
    },
    'Notification settings retrieved successfully'
  );
});

exports.updateNotificationSettings = catchAsync(async (req, res) => {
  const updates = req.body;
  const user = await db.findOne('users', { id: req.user.id });
  if (!user) {
    throw new ApiError('User not found', 404);
  }

  const preferences = { ...(user.preferences || {}) };
  preferences.notifications = { ...(preferences.notifications || {}) };

  const keys = ['emailAnnouncements', 'smsAlerts', 'pushNotifications', 'feeReminders', 'attendanceAlerts', 'examResults'];
  keys.forEach((key) => {
    if (typeof updates[key] === 'boolean') {
      preferences.notifications[key] = updates[key];
    }
  });

  await db.update('users', { preferences }, { id: user.id });
  return ApiResponse.success(
    res,
    { notifications: preferences.notifications },
    'Notification settings updated successfully'
  );
});
