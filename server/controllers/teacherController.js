const crypto = require('crypto');
const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { scopeBySchool } = require('../middleware/auth');
const { buildOrderBy } = require('../utils/sort');

const scopedSchoolClause = (scope, alias) =>
  scope.clause === '1=1' ? '1=1' : `${alias}.${scope.clause}`;

const TEACHER_SORT_ALLOWLIST = {
  createdAt: 't.created_at',
  updatedAt: 't.updated_at',
  firstName: 't.first_name',
  lastName: 't.last_name',
  employeeId: 't.employee_id',
  joiningDate: 't.joining_date',
  employmentType: 't.employment_type',
  status: 't.status',
  designation: 't.designation',
  department: 't.department',
};

const formatTeacher = (teacher) => {
  if (!teacher) return null;
  const {
    id,
    user_id,
    class_teacher_class_id,
    class_teacher_section_id,
    employee_id,
    first_name,
    last_name,
    joining_date,
    employment_type,
    created_at,
    updated_at,
    ...rest
  } = teacher;
  return {
    _id: id,
    employeeId: employee_id,
    firstName: first_name,
    lastName: last_name,
    joiningDate: joining_date,
    employmentType: employment_type,
    createdAt: created_at,
    updatedAt: updated_at,
    ...rest,
  };
};

const formatTimetableEntry = (entry) => {
  if (!entry) return null;
  const {
    id,
    academic_year_id,
    class_id,
    section_id,
    subject_id,
    teacher_id,
    day_of_week,
    period_number,
    start_time,
    end_time,
    room_number,
    is_recurring,
    effective_date,
    created_at,
    updated_at,
    class: cls,
    subject: subj,
    ...rest
  } = entry;
  return {
    _id: id,
    ...rest,
    academicYear: academic_year_id,
    class: cls || undefined,
    section: section_id,
    subject: subj || undefined,
    teacher: teacher_id,
    dayOfWeek: day_of_week,
    periodNumber: period_number,
    startTime: start_time,
    endTime: end_time,
    roomNumber: room_number,
    isRecurring: is_recurring,
    effectiveDate: effective_date,
    createdAt: created_at,
    updatedAt: updated_at,
  };
};

/**
 * Generate a unique employee ID in EMP-YYYY-XXXXX format.
 */
const generateEmployeeId = async (schoolId) => {
  const year = new Date().getFullYear();
  const prefix = `EMP-${year}-`;
  const result = await db.raw(
    `SELECT COUNT(*) AS count FROM teachers WHERE employee_id ILIKE $1 AND school_id = $2`,
    [`${prefix}%`, schoolId]
  );
  const count = parseInt(result[0].count, 10);
  return `${prefix}${String(count + 1).padStart(5, '0')}`;
};

const generateTempPassword = () => `T-${crypto.randomBytes(8).toString('hex')}a1!`;

const getSectionByClassAndId = async (classId, sectionId) => {
  return db.findOne('class_sections', { class_id: classId, id: sectionId });
};

/**
 * Clear a teacher from a section's classTeacher slot.
 */
const clearSectionClassTeacher = async (classId, sectionId) => {
  if (!classId || !sectionId) return;
  const section = await getSectionByClassAndId(classId, sectionId);
  if (!section) return;

  await db.update('class_sections', { class_teacher_id: null }, { id: sectionId });
  await db.raw(
    `UPDATE teachers SET class_teacher_class_id = NULL, class_teacher_section_id = NULL
     WHERE class_teacher_class_id = $1 AND class_teacher_section_id = $2`,
    [classId, sectionId]
  );
};

/**
 * Assign a teacher to a section's classTeacher slot.
 * Clears any other teacher currently assigned to the same section.
 */
const setSectionClassTeacher = async (classId, sectionId, teacherId) => {
  const section = await getSectionByClassAndId(classId, sectionId);
  if (!section) {
    throw new ApiError('Section not found in class', 404);
  }

  // Remove stale class teacher reference from another teacher
  if (section.class_teacher_id && section.class_teacher_id !== teacherId) {
    await db.raw(
      `UPDATE teachers SET class_teacher_class_id = NULL, class_teacher_section_id = NULL
       WHERE id = $1`,
      [section.class_teacher_id]
    );
  }

  await db.update('class_sections', { class_teacher_id: teacherId }, { id: sectionId });
  await db.update(
    'teachers',
    { class_teacher_class_id: classId, class_teacher_section_id: sectionId },
    { id: teacherId }
  );
};

const buildTeacherWhere = (options, req) => {
  const { status, department, designation, employmentType, search } = options;
  const conditions = [];
  const values = [];
  let idx = 1;

  if (status) {
    conditions.push(`t.status = $${idx++}`);
    values.push(status);
  }
  if (department) {
    conditions.push(`t.department ILIKE $${idx++}`);
    values.push(`%${department}%`);
  }
  if (designation) {
    conditions.push(`t.designation ILIKE $${idx++}`);
    values.push(`%${designation}%`);
  }
  if (employmentType) {
    conditions.push(`t.employment_type = $${idx++}`);
    values.push(employmentType);
  }
  if (search) {
    const term = `%${search.trim()}%`;
    conditions.push(
      `(t.first_name ILIKE $${idx} OR t.last_name ILIKE $${idx} OR t.employee_id ILIKE $${idx} OR t.email ILIKE $${idx} OR t.phone ILIKE $${idx})`
    );
    values.push(term);
    idx++;
  }

  const scope = scopeBySchool(req, idx - 1);
  if (scope.clause !== '1=1') {
    conditions.push(`t.${scope.clause}`);
    values.push(...scope.params);
  }
  idx = scope.nextIndex;

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, values, idx };
};

const getPopulatedTeacher = async (teacherId, includeSections = false) => {
  const sectionsAgg = includeSections
    ? `COALESCE(
        (SELECT json_agg(json_build_object('_id', cs.id, 'name', cs.name, 'roomNumber', cs.room_number))
         FROM class_sections cs WHERE cs.class_id = c.id),
        '[]'
      )`
    : `'[]'`;

  const result = await db.raw(
    `
    SELECT
      t.*,
      json_build_object('_id', u.id, 'name', u.name, 'email', u.email, 'phone', u.phone, 'avatar', u.avatar) AS user,
      COALESCE(
        (SELECT json_agg(json_build_object('_id', s.id, 'name', s.name, 'code', s.code, 'type', s.type))
         FROM teacher_subjects ts
         JOIN subjects s ON ts.subject_id = s.id
         WHERE ts.teacher_id = t.id),
        '[]'
      ) AS subjects,
      CASE
        WHEN c.id IS NOT NULL THEN
          json_build_object(
            'class', json_build_object('_id', c.id, 'name', c.name, 'numericName', c.numeric_name, 'sections', ${sectionsAgg}),
            'section', t.class_teacher_section_id
          )
        ELSE NULL
      END AS classTeacher
    FROM teachers t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN classes c ON t.class_teacher_class_id = c.id
    WHERE t.id = $1
    `,
    [teacherId]
  );
  return formatTeacher(result[0]);
};

// @desc    List teachers with search, filter, sort and pagination
// @route   GET /api/v1/teachers
// @access  Admin, Principal, Teacher
exports.getTeachers = catchAsync(async (req, res) => {
  const { status, department, designation, employmentType, search, sort } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const { where, values, idx } = buildTeacherWhere({
    status,
    department,
    designation,
    employmentType,
    search,
  }, req);
  const orderBy = buildOrderBy(sort, undefined, TEACHER_SORT_ALLOWLIST, 't.created_at DESC');

  const listValues = [...values, limit, skip];
  const listQuery = `
    SELECT
      t.*,
      json_build_object('_id', u.id, 'name', u.name, 'email', u.email, 'phone', u.phone, 'avatar', u.avatar) AS user,
      COALESCE(
        (SELECT json_agg(json_build_object('_id', s.id, 'name', s.name, 'code', s.code, 'type', s.type))
         FROM teacher_subjects ts
         JOIN subjects s ON ts.subject_id = s.id
         WHERE ts.teacher_id = t.id),
        '[]'
      ) AS subjects,
      CASE
        WHEN c.id IS NOT NULL THEN
          json_build_object(
            'class', json_build_object('_id', c.id, 'name', c.name, 'numericName', c.numeric_name)
          )
        ELSE NULL
      END AS classTeacher
    FROM teachers t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN classes c ON t.class_teacher_class_id = c.id
    ${where}
    ORDER BY ${orderBy}
    LIMIT $${idx} OFFSET $${idx + 1}
  `;

  const countQuery = `SELECT COUNT(*) AS count FROM teachers t ${where}`;

  const [teachersResult, countResult] = await Promise.all([
    db.raw(listQuery, listValues),
    db.raw(countQuery, values),
  ]);

  const teachers = teachersResult.map(formatTeacher);
  const total = parseInt(countResult[0].count, 10);

  return ApiResponse.paginated(
    res,
    teachers,
    getPaginationMeta(page, limit, total),
    'Teachers retrieved successfully'
  );
});

// @desc    Get single teacher profile
// @route   GET /api/v1/teachers/:id
// @access  Admin, Principal, Teacher
exports.getTeacher = catchAsync(async (req, res) => {
  const teacher = await getPopulatedTeacher(req.params.id, true);

  if (!teacher) {
    throw new ApiError('Teacher not found', 404);
  }

  if (req.user.role !== 'super_admin' && teacher.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  if (teacher.classTeacher && teacher.classTeacher.class) {
    const section = teacher.classTeacher.class.sections?.find(
      (s) => s._id.toString() === teacher.classTeacher.section?.toString()
    );
    teacher.classTeacher.sectionName = section?.name || null;
  }

  return ApiResponse.success(res, { teacher }, 'Teacher retrieved successfully');
});

// @desc    Create a new teacher profile (and user account if needed)
// @route   POST /api/v1/teachers
// @access  Admin
exports.createTeacher = catchAsync(async (req, res) => {
  const {
    employeeId,
    firstName,
    lastName,
    gender,
    dob,
    phone,
    email,
    address,
    qualification,
    specialization,
    designation,
    department,
    salary,
    employmentType,
    subjects,
    joiningDate,
    status,
    user: userId,
    classTeacher,
  } = req.body;

  const schoolId = req.user.school_id;
  const finalEmployeeId = employeeId || (await generateEmployeeId(schoolId));

  const existingEmployee = await db.findOne('teachers', {
    employee_id: finalEmployeeId,
    school_id: schoolId,
  });
  if (existingEmployee) {
    throw new ApiError('Teacher with this employee ID already exists', 409);
  }

  const existingEmail = await db.findOne('teachers', { email, school_id: schoolId });
  if (existingEmail) {
    throw new ApiError('Teacher with this email already exists', 409);
  }

  let linkedUserId = userId;
  let temporaryPassword = null;

  if (userId) {
    const user = await db.findOne('users', { id: userId });
    if (!user) {
      throw new ApiError('Associated user not found', 404);
    }
    if (user.role !== 'teacher') {
      throw new ApiError('Associated user must have teacher role', 400);
    }
  } else {
    const existingUser = await db.findOne('users', { email });
    if (existingUser) {
      throw new ApiError('User with this email already exists', 409);
    }

    temporaryPassword = generateTempPassword();
    const newUser = await db.insert('users', {
      name: `${firstName} ${lastName}`.trim(),
      email,
      phone,
      password: temporaryPassword,
      role: 'teacher',
      status: 'active',
      school_id: schoolId,
    });
    linkedUserId = newUser.id;
  }

  const teacherData = {
    employee_id: finalEmployeeId,
    first_name: firstName,
    last_name: lastName,
    gender,
    dob,
    phone,
    email,
    address,
    qualification,
    specialization,
    designation,
    department,
    salary,
    employment_type: employmentType,
    joining_date: joiningDate,
    status,
    user_id: linkedUserId,
    class_teacher_class_id: classTeacher?.class || null,
    class_teacher_section_id: classTeacher?.section || null,
    school_id: schoolId,
  };

  const teacher = await db.insert('teachers', teacherData);

  if (classTeacher?.class && classTeacher?.section) {
    await setSectionClassTeacher(classTeacher.class, classTeacher.section, teacher.id);
  }

  if (Array.isArray(subjects) && subjects.length > 0) {
    for (const subjectId of subjects) {
      await db.insert('teacher_subjects', {
        teacher_id: teacher.id,
        subject_id: subjectId,
        school_id: schoolId,
      });
    }
  }

  const populatedTeacher = await getPopulatedTeacher(teacher.id);

  return ApiResponse.success(
    res,
    { teacher: populatedTeacher, temporaryPassword },
    'Teacher created successfully',
    201
  );
});

// @desc    Update teacher profile
// @route   PUT /api/v1/teachers/:id
// @access  Admin
exports.updateTeacher = catchAsync(async (req, res) => {
  const teacherId = req.params.id;
  const teacher = await db.findOne('teachers', { id: teacherId });
  if (!teacher) {
    throw new ApiError('Teacher not found', 404);
  }

  if (req.user.role !== 'super_admin' && teacher.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  if (req.body.email && req.body.email !== teacher.email) {
    const existing = await db.findOne('teachers', {
      email: req.body.email,
      school_id: teacher.school_id,
    });
    if (existing && existing.id !== teacherId) {
      throw new ApiError('Teacher with this email already exists', 409);
    }
  }

  if (req.body.employeeId && req.body.employeeId !== teacher.employee_id) {
    const existing = await db.findOne('teachers', {
      employee_id: req.body.employeeId,
      school_id: teacher.school_id,
    });
    if (existing && existing.id !== teacherId) {
      throw new ApiError('Teacher with this employee ID already exists', 409);
    }
  }

  // Handle class teacher reassignment
  if (req.body.classTeacher) {
    const { class: newClassId, section: newSectionId } = req.body.classTeacher;
    const oldClassId = teacher.class_teacher_class_id;
    const oldSectionId = teacher.class_teacher_section_id;

    if (!newClassId || !newSectionId) {
      if (oldClassId || oldSectionId) {
        await clearSectionClassTeacher(oldClassId, oldSectionId);
      }
      req.body.class_teacher_class_id = null;
      req.body.class_teacher_section_id = null;
    } else if (oldClassId !== newClassId || oldSectionId !== newSectionId) {
      await clearSectionClassTeacher(oldClassId, oldSectionId);
      await setSectionClassTeacher(newClassId, newSectionId, teacherId);
      req.body.class_teacher_class_id = newClassId;
      req.body.class_teacher_section_id = newSectionId;
    }
    delete req.body.classTeacher;
  }

  const fieldMap = {
    employeeId: 'employee_id',
    firstName: 'first_name',
    lastName: 'last_name',
    joiningDate: 'joining_date',
    employmentType: 'employment_type',
    user: 'user_id',
    salary: 'salary',
    status: 'status',
    gender: 'gender',
    dob: 'dob',
    phone: 'phone',
    email: 'email',
    address: 'address',
    qualification: 'qualification',
    specialization: 'specialization',
    designation: 'designation',
    department: 'department',
  };

  const updateData = {};
  for (const [key, value] of Object.entries(req.body)) {
    if (value === undefined) continue;
    const dbKey = fieldMap[key] || key;
    updateData[dbKey] = value;
  }

  if (Object.keys(updateData).length > 0) {
    await db.update('teachers', updateData, { id: teacherId });
  }

  if (Array.isArray(req.body.subjects)) {
    await db.raw('DELETE FROM teacher_subjects WHERE teacher_id = $1', [teacherId]);
    for (const subjectId of req.body.subjects) {
      await db.insert('teacher_subjects', {
        teacher_id: teacherId,
        subject_id: subjectId,
        school_id: teacher.school_id,
      });
    }
  }

  const updatedTeacher = await getPopulatedTeacher(teacherId);
  return ApiResponse.success(res, { teacher: updatedTeacher }, 'Teacher updated successfully');
});

// @desc    Soft-delete a teacher
// @route   DELETE /api/v1/teachers/:id
// @access  Admin
exports.deleteTeacher = catchAsync(async (req, res) => {
  const teacherId = req.params.id;
  const teacher = await db.findOne('teachers', { id: teacherId });
  if (!teacher) {
    throw new ApiError('Teacher not found', 404);
  }

  if (req.user.role !== 'super_admin' && teacher.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  await db.update('teachers', { status: 'inactive' }, { id: teacherId });

  if (teacher.user_id) {
    await db.update('users', { status: 'inactive' }, { id: teacher.user_id });
  }

  if (teacher.class_teacher_class_id) {
    await clearSectionClassTeacher(teacher.class_teacher_class_id, teacher.class_teacher_section_id);
  }

  return ApiResponse.success(res, null, 'Teacher deactivated successfully');
});

// @desc    Assign a subject to a teacher
// @route   POST /api/v1/teachers/:id/assign-subject
// @access  Admin
exports.assignSubject = catchAsync(async (req, res) => {
  const { subjectId } = req.body;
  const teacherId = req.params.id;

  const [teacher, subject] = await Promise.all([
    db.findOne('teachers', { id: teacherId }),
    db.findOne('subjects', { id: subjectId }),
  ]);

  if (!teacher) {
    throw new ApiError('Teacher not found', 404);
  }
  if (!subject) {
    throw new ApiError('Subject not found', 404);
  }

  if (req.user.role !== 'super_admin') {
    if (teacher.school_id !== req.user.school_id || subject.school_id !== req.user.school_id) {
      throw new ApiError('Access denied', 403);
    }
  }

  const alreadyAssigned = await db.findOne('teacher_subjects', {
    teacher_id: teacherId,
    subject_id: subjectId,
  });
  if (alreadyAssigned) {
    throw new ApiError('Subject is already assigned to this teacher', 409);
  }

  await db.insert('teacher_subjects', {
    teacher_id: teacherId,
    subject_id: subjectId,
    school_id: teacher.school_id,
  });

  const updatedTeacher = await getPopulatedTeacher(teacherId);

  return ApiResponse.success(
    res,
    { teacher: updatedTeacher },
    'Subject assigned successfully',
    201
  );
});

// @desc    Remove a subject assignment from a teacher
// @route   DELETE /api/v1/teachers/:id/remove-subject
// @access  Admin
exports.removeSubject = catchAsync(async (req, res) => {
  const { subjectId } = req.body;
  const teacherId = req.params.id;

  const teacher = await db.findOne('teachers', { id: teacherId });
  if (!teacher) {
    throw new ApiError('Teacher not found', 404);
  }

  if (req.user.role !== 'super_admin' && teacher.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  await db.raw('DELETE FROM teacher_subjects WHERE teacher_id = $1 AND subject_id = $2', [
    teacherId,
    subjectId,
  ]);

  const updatedTeacher = await getPopulatedTeacher(teacherId);

  return ApiResponse.success(res, { teacher: updatedTeacher }, 'Subject removed successfully');
});

// @desc    Assign a teacher as class teacher of a section
// @route   POST /api/v1/teachers/:id/assign-class
// @access  Admin
exports.assignClass = catchAsync(async (req, res) => {
  const { classId, sectionId } = req.body;
  const teacherId = req.params.id;

  const teacher = await db.findOne('teachers', { id: teacherId });
  if (!teacher) {
    throw new ApiError('Teacher not found', 404);
  }

  if (req.user.role !== 'super_admin' && teacher.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const section = await getSectionByClassAndId(classId, sectionId);
  if (!section) {
    throw new ApiError('Section not found in class', 404);
  }

  // Clear any existing class teacher assignment for this teacher
  const oldClassId = teacher.class_teacher_class_id;
  const oldSectionId = teacher.class_teacher_section_id;
  if (oldClassId || oldSectionId) {
    await clearSectionClassTeacher(oldClassId, oldSectionId);
  }

  await setSectionClassTeacher(classId, sectionId, teacherId);

  const updatedTeacher = await getPopulatedTeacher(teacherId);

  return ApiResponse.success(
    res,
    { teacher: updatedTeacher },
    'Class teacher assignment successful',
    201
  );
});

// @desc    Remove a teacher's class teacher assignment
// @route   DELETE /api/v1/teachers/:id/class
// @access  Admin
exports.removeClass = catchAsync(async (req, res) => {
  const teacherId = req.params.id;
  const teacher = await db.findOne('teachers', { id: teacherId });
  if (!teacher) {
    throw new ApiError('Teacher not found', 404);
  }

  if (req.user.role !== 'super_admin' && teacher.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  if (teacher.class_teacher_class_id) {
    await clearSectionClassTeacher(teacher.class_teacher_class_id, teacher.class_teacher_section_id);
  }

  const updatedTeacher = await getPopulatedTeacher(teacherId);
  return ApiResponse.success(
    res,
    { teacher: updatedTeacher },
    'Class teacher assignment removed successfully'
  );
});

// @desc    Get class-sections assigned to a teacher
// @route   GET /api/v1/teachers/:id/classes
// @access  Admin, Principal, Teacher
exports.getClasses = catchAsync(async (req, res) => {
  const teacher = await getPopulatedTeacher(req.params.id, true);

  if (!teacher) {
    throw new ApiError('Teacher not found', 404);
  }

  if (req.user.role !== 'super_admin' && teacher.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const assignments = [];
  if (teacher.classTeacher && teacher.classTeacher.class) {
    const section = teacher.classTeacher.class.sections?.find(
      (s) => s._id.toString() === teacher.classTeacher.section?.toString()
    );
    assignments.push({
      class: {
        _id: teacher.classTeacher.class._id,
        name: teacher.classTeacher.class.name,
        numericName: teacher.classTeacher.class.numericName,
      },
      section: section
        ? { _id: section._id, name: section.name, roomNumber: section.roomNumber }
        : { _id: teacher.classTeacher.section },
      role: 'class_teacher',
    });
  }

  return ApiResponse.success(
    res,
    { assignments },
    'Teacher class assignments retrieved successfully'
  );
});

// @desc    Get teacher weekly timetable
// @route   GET /api/v1/teachers/:id/timetable
// @access  Admin, Principal, Teacher
exports.getTimetable = catchAsync(async (req, res) => {
  const { academicYear } = req.query;
  const teacherId = req.params.id;

  const teacher = await db.findOne('teachers', { id: teacherId });
  if (!teacher) {
    throw new ApiError('Teacher not found', 404);
  }

  if (req.user.role !== 'super_admin' && teacher.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const scope = scopeBySchool(req, academicYear ? 2 : 1);
  const schoolFilter = scopedSchoolClause(scope, 't');

  const conditions = ['t.teacher_id = $1'];
  const values = [teacherId];
  let idx = 2;

  if (academicYear) {
    conditions.push(`t.academic_year_id = $${idx++}`);
    values.push(academicYear);
  }

  conditions.push(schoolFilter);
  values.push(...scope.params);

  const entries = await db.raw(
    `
    SELECT
      t.*,
      json_build_object('_id', c.id, 'name', c.name, 'numericName', c.numeric_name) AS class,
      json_build_object('_id', s.id, 'name', s.name, 'code', s.code) AS subject
    FROM timetable_entries t
    LEFT JOIN classes c ON t.class_id = c.id
    LEFT JOIN subjects s ON t.subject_id = s.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY t.day_of_week ASC, t.period_number ASC
    `,
    values
  );

  const formattedEntries = entries.map(formatTimetableEntry);

  const grouped = formattedEntries.reduce((acc, entry) => {
    const day = entry.dayOfWeek;
    if (!acc[day]) acc[day] = [];
    acc[day].push(entry);
    return acc;
  }, {});

  return ApiResponse.success(
    res,
    { entries: formattedEntries, grouped },
    'Teacher timetable retrieved successfully'
  );
});

// @desc    Get teacher workload aggregation
// @route   GET /api/v1/teachers/:id/workload
// @access  Admin, Principal, Teacher
exports.getWorkload = catchAsync(async (req, res) => {
  const { academicYear } = req.query;
  const teacherId = req.params.id;

  const teacher = await db.findOne('teachers', { id: teacherId });
  if (!teacher) {
    throw new ApiError('Teacher not found', 404);
  }

  if (req.user.role !== 'super_admin' && teacher.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const scope = scopeBySchool(req, academicYear ? 2 : 1);
  const schoolFilter = scopedSchoolClause(scope, 't');

  const conditions = ['t.teacher_id = $1'];
  const values = [teacherId];
  let idx = 2;

  if (academicYear) {
    conditions.push(`t.academic_year_id = $${idx++}`);
    values.push(academicYear);
  }

  conditions.push(schoolFilter);
  values.push(...scope.params);

  const assignments = await db.raw(
    `
    SELECT
      json_build_object('_id', c.id, 'name', c.name, 'numericName', c.numeric_name) AS class,
      t.section_id AS sectionId,
      json_build_object('_id', s.id, 'name', s.name, 'code', s.code) AS subject,
      COUNT(*)::int AS periods
    FROM timetable_entries t
    JOIN classes c ON t.class_id = c.id
    JOIN subjects s ON t.subject_id = s.id
    WHERE ${conditions.join(' AND ')}
    GROUP BY t.class_id, t.section_id, s.id, c.id
    `,
    values
  );

  const totalPeriods = assignments.reduce((sum, a) => sum + a.periods, 0);

  const classScope = scopeBySchool(req, 1);
  const classSchoolFilter = scopedSchoolClause(classScope, 'c');
  const classTeacherOf = await db.raw(
    `
    SELECT
      cs.id AS "_id",
      c.id AS classId,
      c.name AS className,
      cs.name AS sectionName,
      cs.room_number AS roomNumber
    FROM class_sections cs
    JOIN classes c ON cs.class_id = c.id
    WHERE cs.class_teacher_id = $1 AND ${classSchoolFilter}
    `,
    [teacherId, ...classScope.params]
  );

  return ApiResponse.success(
    res,
    {
      workload: {
        totalPeriods,
        assignments,
        classTeacherOf,
        totalClassesAsClassTeacher: classTeacherOf.length,
      },
    },
    'Workload retrieved successfully'
  );
});

// @desc    Get teacher-class-subject assignment matrix
// @route   GET /api/v1/teachers/assignment-matrix
// @access  Admin, Principal, Teacher
exports.getAssignmentMatrix = catchAsync(async (req, res) => {
  const { academicYear } = req.query;

  const conditions = [];
  const values = [];
  let idx = 1;

  if (academicYear) {
    conditions.push(`te.academic_year_id = $${idx++}`);
    values.push(academicYear);
  }

  const scope = scopeBySchool(req, idx - 1);
  const schoolFilter = scopedSchoolClause(scope, 'te');
  conditions.push(schoolFilter);
  values.push(...scope.params);

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const matrix = await db.raw(
    `
    WITH grouped AS (
      SELECT
        te.teacher_id,
        te.class_id,
        te.section_id,
        json_agg(DISTINCT jsonb_build_object('_id', s.id, 'name', s.name, 'code', s.code)) AS subjects,
        COUNT(*)::int AS period_count
      FROM timetable_entries te
      JOIN subjects s ON te.subject_id = s.id
      ${where}
      GROUP BY te.teacher_id, te.class_id, te.section_id
    )
    SELECT
      t.id AS "_id",
      t.first_name || ' ' || t.last_name AS teacherName,
      t.employee_id AS employeeId,
      COALESCE(
        json_agg(
          json_build_object(
            'classId', c.id,
            'className', c.name,
            'sectionId', g.section_id,
            'subjects', g.subjects,
            'periods', g.period_count
          )
        ),
        '[]'
      ) AS assignments,
      COALESCE(SUM(g.period_count), 0) AS totalPeriods
    FROM grouped g
    JOIN teachers t ON g.teacher_id = t.id
    JOIN classes c ON g.class_id = c.id
    GROUP BY t.id, t.first_name, t.last_name, t.employee_id
    ORDER BY teacherName ASC
    `,
    values
  );

  const conflicts = await db.raw(
    `
    SELECT COUNT(*) AS count FROM (
      SELECT teacher_id, day_of_week, period_number
      FROM timetable_entries te
      ${where}
      GROUP BY teacher_id, day_of_week, period_number
      HAVING COUNT(*) > 1
    ) sub
    `,
    values
  );

  return ApiResponse.success(
    res,
    { matrix, conflictCount: parseInt(conflicts[0].count, 10) },
    'Assignment matrix retrieved successfully'
  );
});
