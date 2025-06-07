const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const notificationService = require('../services/notificationService');
const { getSchoolFilter, scopeBySchool } = require('../middleware/auth');
const { buildOrderBy } = require('../utils/sort');
const { calculateAttendancePercentage } = require('../utils/attendance');

const normalizeDate = (dateInput) => {
  const d = new Date(dateInput);
  d.setHours(0, 0, 0, 0);
  return d;
};

const toISODate = (dateInput) => {
  const d = normalizeDate(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getUserId = (user) => user?.id || user?._id;

const getSectionName = async (classId, sectionId) => {
  if (!classId || !sectionId) return null;
  const section = await db.findOne('class_sections', {
    id: sectionId,
    class_id: classId,
  });
  return section ? section.name : null;
};

const getLateThresholdMinutes = async (schoolId) => {
  const rows = await db.raw(
    'SELECT late_threshold_minutes FROM academic_years WHERE school_id = $1 AND is_current = true LIMIT 1',
    [schoolId]
  );
  if (rows.length && rows[0].late_threshold_minutes != null) {
    return Number(rows[0].late_threshold_minutes);
  }
  return 10;
};

const resolveAttendanceStatus = (inputStatus, minutesLate, lateThresholdMinutes) => {
  if (inputStatus === 'late') return 'late';
  if (inputStatus === 'present' && minutesLate != null && Number(minutesLate) >= lateThresholdMinutes) {
    return 'late';
  }
  return inputStatus;
};

const ATTENDANCE_SELECT = `
  a.id, a.student_id, a.class_id, a.section_id, a.academic_year_id, a.date, a.status, a.type,
  a.subject_id, a.period, a.marked_by_id, a.remarks, a.is_manual, a.created_at, a.updated_at,
  s.first_name AS "student_first_name", s.last_name AS "student_last_name",
  s.roll_no AS "student_roll_no", s.admission_no AS "student_admission_no",
  c.name AS "class_name", c.numeric_name AS "class_numeric_name",
  sec.name AS "section_name",
  sub.name AS "subject_name", sub.code AS "subject_code",
  u.name AS "marked_by_name", u.email AS "marked_by_email", u.role AS "marked_by_role"
`;

const ATTENDANCE_FROM = `
  attendance a
  JOIN students s ON s.id = a.student_id
  JOIN classes c ON c.id = a.class_id
  JOIN class_sections sec ON sec.id = a.section_id
  LEFT JOIN subjects sub ON sub.id = a.subject_id
  JOIN users u ON u.id = a.marked_by_id
`;

const mapAttendanceRow = (row) => ({
  id: row.id,
  student: row.student_id
    ? {
        id: row.student_id,
        firstName: row.student_first_name,
        lastName: row.student_last_name,
        rollNo: row.student_roll_no,
        admissionNo: row.student_admission_no,
      }
    : null,
  class: row.class_id
    ? {
        id: row.class_id,
        name: row.class_name,
        numericName: row.class_numeric_name,
      }
    : null,
  sectionName: row.section_name || null,
  sectionId: row.section_id,
  subject: row.subject_id
    ? {
        id: row.subject_id,
        name: row.subject_name,
        code: row.subject_code,
      }
    : null,
  markedBy: row.marked_by_id
    ? {
        id: row.marked_by_id,
        name: row.marked_by_name,
        email: row.marked_by_email,
        role: row.marked_by_role,
      }
    : null,
  academicYear: row.academic_year_id,
  date: row.date,
  status: row.status,
  type: row.type,
  period: row.period,
  remarks: row.remarks,
  isManual: row.is_manual,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapAttendanceRowGetByDate = (r) => ({
  id: r.id,
  student: {
    id: r.student_id,
    firstName: r.first_name,
    lastName: r.last_name,
    rollNo: r.roll_no,
    admissionNo: r.admission_no,
  },
  class: r.class_id,
  section: r.section_id,
  academicYear: r.academic_year_id,
  date: r.date,
  status: r.status,
  type: r.type,
  subject: r.subject_id
    ? { id: r.subject_id, name: r.subject_name, code: r.subject_code }
    : null,
  period: r.period,
  markedBy: r.marked_by_id
    ? {
        id: r.marked_by_id,
        name: r.marked_by_name,
        email: r.marked_by_email,
        role: r.marked_by_role,
      }
    : null,
  remarks: r.remarks,
  isManual: r.is_manual,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const ATTENDANCE_SORT_ALLOWLIST = {
  date: 'a.date',
  status: 'a.status',
  type: 'a.type',
  period: 'a.period',
  createdAt: 'a.created_at',
  updatedAt: 'a.updated_at',
  'student.rollNo': 's.roll_no',
  'student.roll_no': 's.roll_no',
  'student.firstName': 's.first_name',
  'student.lastName': 's.last_name',
};

const buildOrderBySQL = (sort) => buildOrderBy(sort, undefined, ATTENDANCE_SORT_ALLOWLIST, 'a.date DESC, s.roll_no ASC');

const buildSummaryFromAgg = (aggResults) => {
  const summary = {
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    onLeave: 0,
    total: 0,
  };

  aggResults.forEach((item) => {
    if (item._id === 'present') summary.present = item.count;
    if (item._id === 'absent') summary.absent = item.count;
    if (item._id === 'late') summary.late = item.count;
    if (item._id === 'half_day') summary.halfDay = item.count;
    if (item._id === 'on_leave') summary.onLeave = item.count;
    summary.total += item.count;
  });

  summary.percentage = calculateAttendancePercentage(summary);

  return summary;
};

const searchStudentIds = async (search, req) => {
  const term = `%${search}%`;
  const { clause, params } = scopeBySchool(req, 1);
  const rows = await db.raw(
    `SELECT id FROM students
     WHERE (first_name ILIKE $1
        OR last_name ILIKE $1
        OR admission_no ILIKE $1
        OR roll_no ILIKE $1)
       AND ${clause}`,
    [term, ...params]
  );
  return rows.map((r) => r.id);
};

const enforceStudentAccess = async (req, studentId) => {
  const { user } = req;
  if (!user) throw new ApiError('Authentication required', 401);

  const staffRoles = ['super_admin', 'admin', 'teacher'];
  if (staffRoles.includes(user.role)) return;

  const userId = getUserId(user);

  if (user.role === 'student') {
    const student = await db.findOne('students', {
      user_id: userId,
      ...getSchoolFilter(req),
    });
    if (!student || student.id !== studentId) {
      throw new ApiError('You can only access your own attendance', 403);
    }
    return;
  }

  if (user.role === 'parent') {
    const guardian = await db.findOne('guardians', {
      user_id: userId,
      ...getSchoolFilter(req),
    });
    if (!guardian) {
      throw new ApiError('Guardian profile not found', 403);
    }
    const { clause, params } = scopeBySchool(req, 1);
    const children = await db.raw(
      `SELECT student_id FROM student_guardians WHERE guardian_id = $1 AND ${clause}`,
      [guardian.id, ...params]
    );
    const childIds = children.map((c) => c.student_id);
    if (!childIds.includes(studentId)) {
      throw new ApiError("You can only access your children's attendance", 403);
    }
    return;
  }

  throw new ApiError('Access denied', 403);
};

const applyStudentParentScope = async (req) => {
  const { user } = req;
  if (!user) return null;

  const staffRoles = ['super_admin', 'admin', 'teacher'];
  if (staffRoles.includes(user.role)) return null;

  const userId = getUserId(user);

  if (user.role === 'student') {
    const student = await db.findOne('students', {
      user_id: userId,
      ...getSchoolFilter(req),
    });
    if (!student) throw new ApiError('Student profile not found', 403);
    return { studentId: student.id };
  }

  if (user.role === 'parent') {
    const guardian = await db.findOne('guardians', {
      user_id: userId,
      ...getSchoolFilter(req),
    });
    if (!guardian) throw new ApiError('Guardian profile not found', 403);
    const { clause, params } = scopeBySchool(req, 1);
    const rows = await db.raw(
      `SELECT student_id FROM student_guardians WHERE guardian_id = $1 AND ${clause}`,
      [guardian.id, ...params]
    );
    const studentIds = rows.map((r) => r.student_id);
    if (!studentIds.length) {
      throw new ApiError('No children linked to your account', 403);
    }
    return { studentIds };
  }

  throw new ApiError('Access denied', 403);
};

const buildAttendanceListQuery = (options, req) => {
  const { where = {}, allowedStudentIds, sort, limit, offset } = options;
  const params = [];
  const conditions = [];

  const add = (field, value) => {
    params.push(value);
    conditions.push(`${field} = $${params.length}`);
  };

  if (where.class_id) add('a.class_id', where.class_id);
  if (where.section_id) add('a.section_id', where.section_id);
  if (where.student_id) add('a.student_id', where.student_id);
  if (where.status) add('a.status', where.status);
  if (where.type) add('a.type', where.type);
  if (where.subject_id) add('a.subject_id', where.subject_id);

  if (where.dateRangeExclusive) {
    params.push(where.dateRangeExclusive.start, where.dateRangeExclusive.end);
    conditions.push(
      `a.date >= $${params.length - 1} AND a.date < $${params.length}`
    );
  } else if (where.dateRange) {
    params.push(where.dateRange.start, where.dateRange.end);
    conditions.push(
      `a.date >= $${params.length - 1} AND a.date <= $${params.length}`
    );
  }

  if (allowedStudentIds && allowedStudentIds.length) {
    const placeholders = allowedStudentIds
      .map((_, i) => `$${params.length + i + 1}`)
      .join(', ');
    conditions.push(`a.student_id IN (${placeholders})`);
    params.push(...allowedStudentIds);
  }

  const schoolFilter = getSchoolFilter(req);
  if (schoolFilter.school_id) {
    params.push(schoolFilter.school_id);
    conditions.push(`a.school_id = $${params.length}`);
  }

  const whereSQL = conditions.length ? conditions.join(' AND ') : '1=1';
  const orderBySQL = buildOrderBySQL(sort);

  const baseParams = [...params];

  const selectQuery = `
    SELECT ${ATTENDANCE_SELECT}
    FROM ${ATTENDANCE_FROM}
    WHERE ${whereSQL}
    ORDER BY ${orderBySQL}
    LIMIT $${baseParams.length + 1} OFFSET $${baseParams.length + 2}
  `;
  const selectParams = [...baseParams, limit, offset];

  const countQuery = `SELECT COUNT(*) AS count FROM attendance a WHERE ${whereSQL}`;

  return { selectQuery, countQuery, selectParams, countParams: baseParams };
};

// @desc    Mark attendance for a single student
// @route   POST /api/v1/attendance/mark
// @access  Admin, Teacher
exports.markAttendance = catchAsync(async (req, res) => {
  const {
    studentId,
    classId,
    sectionId,
    academicYearId,
    date,
    status,
    minutesLate,
    type,
    subjectId,
    period,
    remarks,
  } = req.body;

  const cls = await db.findOne('classes', { id: classId, ...getSchoolFilter(req) });
  if (!cls) throw new ApiError('Class not found', 404);

  const section = await db.findOne('class_sections', {
    id: sectionId,
    class_id: classId,
    ...getSchoolFilter(req),
  });
  if (!section) {
    throw new ApiError('Section not found in class', 404);
  }

  const student = await db.findOne('students', {
    id: studentId,
    class_id: classId,
    section_id: sectionId,
    status: 'active',
    ...getSchoolFilter(req),
  });

  if (!student) {
    throw new ApiError('Active student not found in this class-section', 404);
  }

  const normalizedDate = toISODate(date);
  const academicYear =
    academicYearId || student.academic_year_id || cls.academic_year_id;

  const existingWhere = {
    student_id: studentId,
    date: normalizedDate,
    type,
  };
  if (type === 'subject' && subjectId) existingWhere.subject_id = subjectId;

  const existing = await db.findOne('attendance', existingWhere);
  if (existing) {
    throw new ApiError(
      'Attendance already marked for this student on the given date. Use update instead.',
      409
    );
  }

  const lateThresholdMinutes = await getLateThresholdMinutes(req.user.school_id);
  const effectiveStatus = resolveAttendanceStatus(status, minutesLate, lateThresholdMinutes);

  const attendance = await db.insert('attendance', {
    student_id: studentId,
    class_id: classId,
    section_id: sectionId,
    academic_year_id: academicYear,
    school_id: req.user.school_id,
    date: normalizedDate,
    status: effectiveStatus,
    type,
    subject_id: type === 'subject' ? subjectId : null,
    period: type === 'subject' ? period : null,
    marked_by_id: getUserId(req.user),
    remarks,
    is_manual: true,
  });

  // Fire-and-forget in-app notification to student/guardians for absent/late
  if (['absent', 'late'].includes(effectiveStatus)) {
    notificationService.getStudentAndGuardianUserIds(studentId)
      .then((recipientIds) => {
        if (recipientIds.length === 0) return;
        return notificationService.createBulkNotifications({
          recipientIds,
          senderId: getUserId(req.user),
          title: `Student marked ${status}`,
          message: `${student.first_name} ${student.last_name} was marked ${status} on ${normalizedDate}.`,
          type: 'attendance',
          referenceModel: 'attendance',
          referenceId: attendance.id,
        });
      })
      .catch((err) => console.error('Failed to create attendance notifications:', err.message));
  }

  const { clause: popClause, params: popParams } = scopeBySchool(req, 1);
  const popSchoolCondition = popClause === '1=1' ? popClause : `a.${popClause}`;
  const populatedRows = await db.raw(
    `SELECT ${ATTENDANCE_SELECT} FROM ${ATTENDANCE_FROM} WHERE a.id = $1 AND ${popSchoolCondition}`,
    [attendance.id, ...popParams]
  );
  const populatedAttendance = populatedRows[0]
    ? mapAttendanceRow(populatedRows[0])
    : null;

  return ApiResponse.success(
    res,
    { attendance: populatedAttendance },
    'Attendance marked successfully',
    201
  );
});

// @desc    Bulk mark attendance for a class-section
// @route   POST /api/v1/attendance/bulk-mark
// @access  Admin, Teacher
exports.bulkMarkAttendance = catchAsync(async (req, res) => {
  const {
    classId,
    sectionId,
    academicYearId,
    date,
    type,
    subjectId,
    period,
    records,
  } = req.body;

  const cls = await db.findOne('classes', { id: classId, ...getSchoolFilter(req) });
  if (!cls) throw new ApiError('Class not found', 404);

  const section = await db.findOne('class_sections', {
    id: sectionId,
    class_id: classId,
    ...getSchoolFilter(req),
  });
  if (!section) {
    throw new ApiError('Section not found in class', 404);
  }

  const normalizedDate = toISODate(date);
  const defaultAcademicYear = academicYearId || cls.academic_year_id;

  const studentIds = records.map((r) => r.studentId);
  const uniqueStudentIds = [...new Set(studentIds.map(String))];

  if (uniqueStudentIds.length !== studentIds.length) {
    throw new ApiError('Duplicate students found in attendance records', 400);
  }

  const { clause: stClause, params: stParams } = scopeBySchool(req, uniqueStudentIds.length + 2);
  const placeholders = uniqueStudentIds
    .map((_, i) => `$${i + 3}`)
    .join(', ');
  const students = await db.raw(
    `SELECT * FROM students
     WHERE id IN (${placeholders})
       AND class_id = $1
       AND section_id = $2
       AND status = 'active'
       AND ${stClause}`,
    [classId, sectionId, ...uniqueStudentIds, ...stParams]
  );

  if (students.length !== uniqueStudentIds.length) {
    throw new ApiError(
      'One or more students are not active or do not belong to this class-section',
      400
    );
  }

  const existingCountWhere = {
    class_id: classId,
    section_id: sectionId,
    date: normalizedDate,
    type,
    ...getSchoolFilter(req),
  };
  if (type === 'subject' && subjectId) existingCountWhere.subject_id = subjectId;

  const existingCount = await db.count('attendance', existingCountWhere);
  if (existingCount > 0) {
    throw new ApiError(
      'Attendance already marked for this class-section-date. Use update instead.',
      409
    );
  }

  const studentMap = new Map(
    students.map((s) => [String(s.id), s])
  );

  const lateThresholdMinutes = await getLateThresholdMinutes(req.user.school_id);

  const valueRows = [];
  const values = [];
  let paramIndex = 1;

  for (const rec of records) {
    const student = studentMap.get(String(rec.studentId));
    const effectiveStatus = resolveAttendanceStatus(rec.status, rec.minutesLate, lateThresholdMinutes);
    const row = [
      rec.studentId,
      classId,
      sectionId,
      academicYearId || student.academic_year_id || defaultAcademicYear,
      req.user.school_id,
      normalizedDate,
      effectiveStatus,
      type,
      type === 'subject' ? subjectId : null,
      type === 'subject' ? period : null,
      getUserId(req.user),
      rec.remarks || '',
      true,
    ];
    const rowPlaceholders = row.map(() => `$${paramIndex++}`).join(', ');
    valueRows.push(`(${rowPlaceholders})`);
    values.push(...row);
  }

  const insertQuery = `
    INSERT INTO attendance
      (student_id, class_id, section_id, academic_year_id, school_id, date, status, type,
       subject_id, period, marked_by_id, remarks, is_manual)
    VALUES ${valueRows.join(', ')}
    RETURNING id
  `;

  const inserted = await db.raw(insertQuery, values);

  // Fire-and-forget in-app notifications for absent/late records
  records.forEach((rec, idx) => {
    const effectiveStatus = resolveAttendanceStatus(rec.status, rec.minutesLate, lateThresholdMinutes);
    if (!['absent', 'late'].includes(effectiveStatus)) return;
    const attendanceId = inserted[idx]?.id;
    if (!attendanceId) return;
    const student = studentMap.get(String(rec.studentId));
    notificationService.getStudentAndGuardianUserIds(rec.studentId)
      .then((recipientIds) => {
        if (recipientIds.length === 0) return;
        return notificationService.createBulkNotifications({
          recipientIds,
          senderId: getUserId(req.user),
          title: `Student marked ${effectiveStatus}`,
          message: `${student.first_name} ${student.last_name} was marked ${effectiveStatus} on ${normalizedDate}.`,
          type: 'attendance',
          referenceModel: 'attendance',
          referenceId: attendanceId,
        });
      })
      .catch((err) => console.error('Failed to create attendance notifications:', err.message));
  });

  return ApiResponse.success(
    res,
    { inserted: inserted.length },
    `Attendance marked for ${inserted.length} students`,
    201
  );
});

// @desc    List attendance records with filters, search, sort and pagination
// @route   GET /api/v1/attendance
// @access  Admin, Teacher, Student (self), Parent (child)
exports.getAttendance = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { sort, search } = req.query;

  const where = {};
  if (req.query.classId) where.class_id = req.query.classId;
  if (req.query.sectionId) where.section_id = req.query.sectionId;
  if (req.query.studentId) where.student_id = req.query.studentId;
  if (req.query.status) where.status = req.query.status;
  if (req.query.type) where.type = req.query.type;
  if (req.query.subjectId) where.subject_id = req.query.subjectId;

  if (req.query.date) {
    const d = normalizeDate(req.query.date);
    const nextDay = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    where.dateRangeExclusive = {
      start: toISODate(d),
      end: toISODate(nextDay),
    };
  } else if (req.query.startDate && req.query.endDate) {
    where.dateRange = {
      start: toISODate(req.query.startDate),
      end: toISODate(req.query.endDate),
    };
  }

  const scope = await applyStudentParentScope(req);
  let allowedStudentIds = null;
  if (scope?.studentId) {
    allowedStudentIds = [scope.studentId];
  } else if (scope?.studentIds) {
    allowedStudentIds = scope.studentIds;
  }

  if (search) {
    const matchedIds = await searchStudentIds(search, req);
    if (allowedStudentIds) {
      allowedStudentIds = allowedStudentIds.filter((id) =>
        matchedIds.includes(id)
      );
    } else {
      allowedStudentIds = matchedIds;
    }
  }

  if (allowedStudentIds && !allowedStudentIds.length) {
    const meta = getPaginationMeta(page, limit, 0);
    return ApiResponse.paginated(res, [], meta, 'Attendance records retrieved');
  }

  const { selectQuery, countQuery, selectParams, countParams } =
    buildAttendanceListQuery(
      {
        where,
        allowedStudentIds,
        sort,
        limit,
        offset: skip,
      },
      req
    );

  const [records, countResult] = await Promise.all([
    db.raw(selectQuery, selectParams),
    db.raw(countQuery, countParams),
  ]);

  const total = parseInt(countResult[0].count, 10);
  const mappedRecords = records.map(mapAttendanceRow);

  const meta = getPaginationMeta(page, limit, total);
  return ApiResponse.paginated(
    res,
    mappedRecords,
    meta,
    'Attendance records retrieved'
  );
});

// @desc    Get a single attendance record
// @route   GET /api/v1/attendance/:id
// @access  Admin, Teacher, Student (self), Parent (child)
exports.getAttendanceById = catchAsync(async (req, res) => {
  const { clause, params } = scopeBySchool(req, 1);
  const schoolCondition = clause === '1=1' ? clause : `a.${clause}`;
  const rows = await db.raw(
    `SELECT ${ATTENDANCE_SELECT} FROM ${ATTENDANCE_FROM} WHERE a.id = $1 AND ${schoolCondition}`,
    [req.params.id, ...params]
  );
  const record = rows[0] ? mapAttendanceRow(rows[0]) : null;

  if (!record) throw new ApiError('Attendance record not found', 404);

  await enforceStudentAccess(req, record.student.id);

  record.sectionName = await getSectionName(record.class.id, record.sectionId);

  return ApiResponse.success(
    res,
    { attendance: record },
    'Attendance record retrieved'
  );
});

// @desc    Get attendance for a class (and optional section) on a specific date
// @route   GET /api/v1/attendance/date/:date/class/:classId
// @route   GET /api/v1/attendance/date/:date/class/:classId/section/:sectionId
// @access  Admin, Teacher
exports.getByDate = catchAsync(async (req, res) => {
  const { date, classId } = req.params;
  const sectionId = req.params.sectionId || req.query.sectionId;
  const { type, subjectId } = req.query;

  const cls = await db.findOne('classes', { id: classId, ...getSchoolFilter(req) });
  if (!cls) throw new ApiError('Class not found', 404);

  const normalizedDate = toISODate(date);

  const attendanceParams = [classId, normalizedDate];
  const attendanceConditions = ['a.class_id = $1', 'a.date = $2'];

  if (sectionId) {
    attendanceParams.push(sectionId);
    attendanceConditions.push(`a.section_id = $${attendanceParams.length}`);
  }
  if (type) {
    attendanceParams.push(type);
    attendanceConditions.push(`a.type = $${attendanceParams.length}`);
  }
  if (type === 'subject' && subjectId) {
    attendanceParams.push(subjectId);
    attendanceConditions.push(`a.subject_id = $${attendanceParams.length}`);
  }

  const { clause: attClause, params: attParams } = scopeBySchool(req, attendanceParams.length);
  if (attClause !== '1=1') {
    attendanceConditions.push(`a.${attClause}`);
    attendanceParams.push(...attParams);
  }

  const attendanceQuery = `
    SELECT a.*,
           s.id AS student_id, s.first_name, s.last_name, s.roll_no, s.admission_no,
           sub.name AS subject_name, sub.code AS subject_code,
           u.name AS marked_by_name, u.email AS marked_by_email, u.role AS marked_by_role
    FROM attendance a
    JOIN students s ON s.id = a.student_id
    LEFT JOIN subjects sub ON sub.id = a.subject_id
    JOIN users u ON u.id = a.marked_by_id
    WHERE ${attendanceConditions.join(' AND ')}
    ORDER BY s.roll_no ASC
  `;

  const studentParams = [classId];
  const studentConditions = ['class_id = $1', "status = 'active'"];
  if (sectionId) {
    studentParams.push(sectionId);
    studentConditions.push(`section_id = $${studentParams.length}`);
  }

  const { clause: stClause, params: stParams } = scopeBySchool(req, studentParams.length);
  if (stClause !== '1=1') {
    studentConditions.push(stClause);
    studentParams.push(...stParams);
  }

  const studentQuery = `
    SELECT id, first_name, last_name, roll_no, admission_no, section_id
    FROM students
    WHERE ${studentConditions.join(' AND ')}
    ORDER BY roll_no ASC
  `;

  const [records, allStudents] = await Promise.all([
    db.raw(attendanceQuery, attendanceParams),
    db.raw(studentQuery, studentParams),
  ]);

  const attendanceMap = new Map(
    records.map((r) => [String(r.student_id), mapAttendanceRowGetByDate(r)])
  );

  const studentAttendance = allStudents.map((student) => ({
    student,
    attendance: attendanceMap.get(String(student.id)) || null,
  }));

  const summary = {
    total: allStudents.length,
    present: records.filter((r) => r.status === 'present').length,
    absent: records.filter((r) => r.status === 'absent').length,
    late: records.filter((r) => r.status === 'late').length,
    halfDay: records.filter((r) => r.status === 'half_day').length,
    onLeave: records.filter((r) => r.status === 'on_leave').length,
    notMarked: allStudents.length - records.length,
  };

  return ApiResponse.success(
    res,
    {
      attendance: studentAttendance,
      summary,
      sectionName: await getSectionName(cls.id, sectionId),
    },
    'Attendance records retrieved'
  );
});

// @desc    Get all attendance for a student
// @route   GET /api/v1/attendance/student/:studentId
// @access  Admin, Teacher, Student (self), Parent (child)
exports.getByStudent = catchAsync(async (req, res) => {
  const { studentId } = req.params;
  await enforceStudentAccess(req, studentId);

  const { startDate, endDate, status, type, subjectId, sort } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const where = { student_id: studentId };
  if (startDate && endDate) {
    where.dateRange = {
      start: toISODate(startDate),
      end: toISODate(endDate),
    };
  }
  if (status) where.status = status;
  if (type) where.type = type;
  if (subjectId) where.subject_id = subjectId;

  const { selectQuery, countQuery, selectParams, countParams } =
    buildAttendanceListQuery(
      {
        where,
        sort,
        limit,
        offset: skip,
      },
      req
    );

  const aggParams = [studentId];
  const aggConditions = ['student_id = $1'];
  if (startDate && endDate) {
    aggParams.push(toISODate(startDate), toISODate(endDate));
    aggConditions.push(
      `date >= $${aggParams.length - 1} AND date <= $${aggParams.length}`
    );
  }
  if (status) {
    aggParams.push(status);
    aggConditions.push(`status = $${aggParams.length}`);
  }
  if (type) {
    aggParams.push(type);
    aggConditions.push(`type = $${aggParams.length}`);
  }
  if (subjectId) {
    aggParams.push(subjectId);
    aggConditions.push(`subject_id = $${aggParams.length}`);
  }

  const { clause: aggClause, params: aggSchoolParams } = scopeBySchool(req, aggParams.length);
  if (aggClause !== '1=1') {
    aggConditions.push(aggClause);
    aggParams.push(...aggSchoolParams);
  }

  const aggQuery = `
    SELECT status AS _id, COUNT(*)::int AS count
    FROM attendance
    WHERE ${aggConditions.join(' AND ')}
    GROUP BY status
  `;

  const [records, countResult, summaryAgg] = await Promise.all([
    db.raw(selectQuery, selectParams),
    db.raw(countQuery, countParams),
    db.raw(aggQuery, aggParams),
  ]);

  const total = parseInt(countResult[0].count, 10);
  const mappedRecords = records.map(mapAttendanceRow);
  const summary = buildSummaryFromAgg(summaryAgg);
  const meta = getPaginationMeta(page, limit, total);

  return ApiResponse.success(
    res,
    { records: mappedRecords, summary, meta },
    'Student attendance retrieved'
  );
});

// @desc    Get class-wise attendance report
// @route   GET /api/v1/attendance/report
// @access  Admin, Teacher
exports.getReport = catchAsync(async (req, res) => {
  const { classId, sectionId, startDate, endDate } = req.query;

  const cls = await db.findOne('classes', { id: classId, ...getSchoolFilter(req) });
  if (!cls) throw new ApiError('Class not found', 404);

  const studentWhere = { class_id: classId, status: 'active', ...getSchoolFilter(req) };
  if (sectionId) studentWhere.section_id = sectionId;
  const totalStudents = await db.count('students', studentWhere);

  const attendanceParams = [classId];
  const attendanceConditions = ['class_id = $1'];
  if (sectionId) {
    attendanceParams.push(sectionId);
    attendanceConditions.push(`section_id = $${attendanceParams.length}`);
  }
  if (startDate && endDate) {
    attendanceParams.push(toISODate(startDate), toISODate(endDate));
    attendanceConditions.push(
      `date >= $${attendanceParams.length - 1} AND date <= $${attendanceParams.length}`
    );
  }

  const { clause: attClause, params: attParams } = scopeBySchool(req, attendanceParams.length);
  if (attClause !== '1=1') {
    attendanceConditions.push(attClause);
    attendanceParams.push(...attParams);
  }

  const attendanceQuery = `
    SELECT * FROM attendance
    WHERE ${attendanceConditions.join(' AND ')}
  `;

  const records = await db.raw(attendanceQuery, attendanceParams);

  const summary = {
    totalStudents,
    totalRecords: records.length,
    present: records.filter((r) => r.status === 'present').length,
    absent: records.filter((r) => r.status === 'absent').length,
    late: records.filter((r) => r.status === 'late').length,
    halfDay: records.filter((r) => r.status === 'half_day').length,
    onLeave: records.filter((r) => r.status === 'on_leave').length,
  };

  return ApiResponse.success(res, { summary }, 'Attendance report retrieved');
});

// @desc    Get monthly attendance report for a class-section
// @route   GET /api/v1/attendance/monthly-report
// @access  Admin, Teacher
exports.getMonthlyReport = catchAsync(async (req, res) => {
  const { classId, sectionId, month, year } = req.query;

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const cls = await db.findOne('classes', { id: classId, ...getSchoolFilter(req) });
  if (!cls) throw new ApiError('Class not found', 404);

  const studentParams = [classId];
  const studentConditions = ['class_id = $1', "status = 'active'"];
  if (sectionId) {
    studentParams.push(sectionId);
    studentConditions.push(`section_id = $${studentParams.length}`);
  }

  const { clause: stClause, params: stParams } = scopeBySchool(req, studentParams.length);
  if (stClause !== '1=1') {
    studentConditions.push(stClause);
    studentParams.push(...stParams);
  }

  const students = await db.raw(
    `SELECT id, first_name, last_name, roll_no, section_id
     FROM students
     WHERE ${studentConditions.join(' AND ')}
     ORDER BY roll_no ASC`,
    studentParams
  );

  const studentIds = students.map((s) => s.id);

  let attendanceRecords = [];
  if (studentIds.length) {
    const placeholders = studentIds
      .map((_, i) => `$${i + 3}`)
      .join(', ');
    const attParams = [
      toISODate(startOfMonth),
      toISODate(endOfMonth),
      ...studentIds,
    ];
    const { clause: attClause, params: attSchoolParams } = scopeBySchool(
      req,
      attParams.length
    );
    const schoolFilterSql = attClause === '1=1' ? '' : `AND ${attClause}`;
    attendanceRecords = await db.raw(
      `SELECT
         student_id,
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)::int AS present,
         SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END)::int AS absent,
         SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END)::int AS late,
         SUM(CASE WHEN status = 'half_day' THEN 1 ELSE 0 END)::int AS half_day,
         SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END)::int AS on_leave,
         COUNT(*)::int AS total
       FROM attendance
       WHERE student_id IN (${placeholders})
         AND date >= $1
         AND date <= $2
         ${schoolFilterSql}
       GROUP BY student_id`,
      [...attParams, ...attSchoolParams]
    );
  }

  const report = students.map((student) => {
    const record = attendanceRecords.find(
      (r) => String(r.student_id) === String(student.id)
    );

    const total = record?.total || 0;
    const present = record?.present || 0;
    const late = record?.late || 0;
    const halfDay = record?.half_day || 0;
    const onLeave = record?.on_leave || 0;
    const absent = record?.absent || 0;
    const percentage = calculateAttendancePercentage({ present, absent, late, halfDay, onLeave });

    return {
      student,
      attendance: { total, present, absent, late, halfDay, onLeave, percentage },
    };
  });

  const avgPercentage =
    report.length > 0
      ? (
          report.reduce((sum, r) => sum + Number(r.attendance.percentage), 0) /
          report.length
        ).toFixed(2)
      : 0;

  return ApiResponse.success(
    res,
    {
      report,
      classAverage: avgPercentage,
      sectionName: await getSectionName(cls.id, sectionId),
      month,
      year,
    },
    'Monthly attendance report retrieved'
  );
});

// @desc    Get attendance defaulters below threshold
// @route   GET /api/v1/attendance/defaulters
// @access  Admin, Teacher
exports.getDefaulters = catchAsync(async (req, res) => {
  const { classId, sectionId, startDate, endDate, threshold } = req.query;
  const numericThreshold = Number(threshold);

  const cls = await db.findOne('classes', { id: classId, ...getSchoolFilter(req) });
  if (!cls) throw new ApiError('Class not found', 404);

  const studentParams = [classId];
  const studentConditions = ['class_id = $1', "status = 'active'"];
  if (sectionId) {
    studentParams.push(sectionId);
    studentConditions.push(`section_id = $${studentParams.length}`);
  }

  const { clause: stClause, params: stParams } = scopeBySchool(req, studentParams.length);
  if (stClause !== '1=1') {
    studentConditions.push(stClause);
    studentParams.push(...stParams);
  }

  const students = await db.raw(
    `SELECT id, first_name, last_name, roll_no
     FROM students
     WHERE ${studentConditions.join(' AND ')}`,
    studentParams
  );

  const studentIds = students.map((s) => s.id);

  let attendanceRecords = [];
  if (studentIds.length) {
    const aggParams = [...studentIds];
    const placeholders = studentIds
      .map((_, i) => `$${i + 1}`)
      .join(', ');
    const dateConditions = [];

    if (startDate && endDate) {
      aggParams.push(toISODate(startDate), toISODate(endDate));
      dateConditions.push(
        `date >= $${aggParams.length - 1} AND date <= $${aggParams.length}`
      );
    }

    const { clause: attClause, params: attSchoolParams } = scopeBySchool(
      req,
      aggParams.length
    );
    const schoolCondition = attClause === '1=1' ? [] : [attClause];
    const whereClause = [
      `student_id IN (${placeholders})`,
      ...dateConditions,
      ...schoolCondition,
    ].join(' AND ');

    attendanceRecords = await db.raw(
      `SELECT
         student_id,
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)::int AS present,
         SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END)::int AS absent,
         SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END)::int AS late,
         SUM(CASE WHEN status = 'half_day' THEN 1 ELSE 0 END)::int AS half_day,
         SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END)::int AS on_leave,
         COUNT(*)::int AS total
       FROM attendance
       WHERE ${whereClause}
       GROUP BY student_id`,
      [...aggParams, ...attSchoolParams]
    );
  }

  const defaulters = [];
  students.forEach((student) => {
    const record = attendanceRecords.find(
      (r) => String(r.student_id) === String(student.id)
    );

    const total = record?.total || 0;
    if (total === 0) return;

    const percentage = calculateAttendancePercentage({
      present: record?.present || 0,
      absent: record?.absent || 0,
      late: record?.late || 0,
      halfDay: record?.half_day || 0,
      onLeave: record?.on_leave || 0,
    });

    if (percentage < numericThreshold) {
      defaulters.push({
        student,
        totalDays: total,
        presentDays: record?.present || 0,
        percentage,
      });
    }
  });

  defaulters.sort((a, b) => Number(a.percentage) - Number(b.percentage));

  return ApiResponse.success(
    res,
    { defaulters, count: defaulters.length, threshold },
    'Attendance defaulters retrieved'
  );
});

// @desc    Get daily class summary
// @route   GET /api/v1/attendance/class-summary
// @access  Admin, Teacher
exports.getClassSummary = catchAsync(async (req, res) => {
  const { classId, sectionId, date } = req.query;
  const normalizedDate = toISODate(date);

  const cls = await db.findOne('classes', { id: classId, ...getSchoolFilter(req) });
  if (!cls) throw new ApiError('Class not found', 404);

  const studentWhere = { class_id: classId, status: 'active', ...getSchoolFilter(req) };
  if (sectionId) studentWhere.section_id = sectionId;
  const totalStudents = await db.count('students', studentWhere);

  const attendanceParams = [classId, normalizedDate];
  const attendanceConditions = ['class_id = $1', 'date = $2'];
  if (sectionId) {
    attendanceParams.push(sectionId);
    attendanceConditions.push(`section_id = $${attendanceParams.length}`);
  }

  const { clause: attClause, params: attParams } = scopeBySchool(req, attendanceParams.length);
  if (attClause !== '1=1') {
    attendanceConditions.push(attClause);
    attendanceParams.push(...attParams);
  }

  const records = await db.raw(
    `SELECT * FROM attendance WHERE ${attendanceConditions.join(' AND ')}`,
    attendanceParams
  );

  const present = records.filter((r) => r.status === 'present').length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const late = records.filter((r) => r.status === 'late').length;
  const halfDay = records.filter((r) => r.status === 'half_day').length;
  const onLeave = records.filter((r) => r.status === 'on_leave').length;
  const notMarked = totalStudents - records.length;

  const summary = {
    date: normalizedDate,
    classId,
    sectionId: sectionId || null,
    sectionName: await getSectionName(cls.id, sectionId),
    totalStudents,
    marked: records.length,
    notMarked,
    present,
    absent,
    late,
    halfDay,
    onLeave,
    presentPercentage:
      totalStudents > 0 ? ((present / totalStudents) * 100).toFixed(2) : 0,
    absentPercentage:
      totalStudents > 0 ? ((absent / totalStudents) * 100).toFixed(2) : 0,
    latePercentage:
      totalStudents > 0 ? ((late / totalStudents) * 100).toFixed(2) : 0,
  };

  return ApiResponse.success(
    res,
    { summary },
    'Class attendance summary retrieved'
  );
});

// @desc    Update a specific attendance record
// @route   PUT /api/v1/attendance/:id
// @access  Admin, Teacher
exports.updateAttendance = catchAsync(async (req, res) => {
  const attendance = await db.findOne('attendance', {
    id: req.params.id,
    ...getSchoolFilter(req),
  });
  if (!attendance) throw new ApiError('Attendance record not found', 404);

  const recordDate = new Date(toISODate(attendance.date));
  const today = new Date(toISODate(new Date()));
  const diffDays = (today - recordDate) / (1000 * 60 * 60 * 24);

  const canEdit =
    ['super_admin', 'admin'].includes(req.user.role) || diffDays <= 7;
  if (!canEdit) {
    throw new ApiError(
      'Attendance can only be corrected within 7 days. Admin approval required for older records.',
      403
    );
  }

  const updateData = {
    marked_by_id: getUserId(req.user),
  };
  if (req.body.status) updateData.status = req.body.status;
  if (req.body.remarks !== undefined) updateData.remarks = req.body.remarks;
  if (req.body.isManual !== undefined) updateData.is_manual = req.body.isManual;

  const [updated] = await db.update('attendance', updateData, {
    id: req.params.id,
  });

  const { clause: popClause, params: popParams } = scopeBySchool(req, 1);
  const popSchoolCondition = popClause === '1=1' ? popClause : `a.${popClause}`;
  const populatedRows = await db.raw(
    `SELECT ${ATTENDANCE_SELECT} FROM ${ATTENDANCE_FROM} WHERE a.id = $1 AND ${popSchoolCondition}`,
    [updated.id, ...popParams]
  );
  const updatedAttendance = populatedRows[0]
    ? mapAttendanceRow(populatedRows[0])
    : null;

  return ApiResponse.success(
    res,
    { attendance: updatedAttendance },
    'Attendance record updated successfully'
  );
});
