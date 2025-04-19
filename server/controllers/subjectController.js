const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { scopeBySchool } = require('../middleware/auth');
const { buildOrderBy } = require('../utils/sort');

const scopedSchoolClause = (scope, alias) =>
  scope.clause === '1=1' ? '1=1' : `${alias}.${scope.clause}`;

// ---------- Subjects catalog ----------

exports.getSubjects = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { search, type, status, applicableClass, sort = 'name' } = req.query;

  const whereClauses = [];
  const params = [];
  let paramIndex = 1;

  if (type) {
    whereClauses.push(`s.type = $${paramIndex++}`);
    params.push(type);
  }
  if (status) {
    whereClauses.push(`s.status = $${paramIndex++}`);
    params.push(status);
  }
  if (applicableClass) {
    whereClauses.push(`sac.class_id = $${paramIndex++}`);
    params.push(applicableClass);
  }
  if (search) {
    whereClauses.push(`(s.name ILIKE $${paramIndex} OR s.code ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex += 1;
  }

  const scope = scopeBySchool(req, paramIndex - 1);
  const schoolFilter = scopedSchoolClause(scope, 's');
  whereClauses.push(schoolFilter);

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const SUBJECT_SORT_ALLOWLIST = {
    name: 'name',
    code: 'code',
    type: 'type',
    status: 'status',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  };
  const orderBy = buildOrderBy(sort, undefined, SUBJECT_SORT_ALLOWLIST, 'name ASC');

  const countQuery = `
    SELECT COUNT(DISTINCT s.id) AS count
    FROM subjects s
    LEFT JOIN subject_applicable_classes sac ON s.id = sac.subject_id
    ${whereSql}
  `;
  const dataQuery = `
    SELECT s.*
    FROM subjects s
    LEFT JOIN subject_applicable_classes sac ON s.id = sac.subject_id
    ${whereSql}
    GROUP BY s.id
    ORDER BY ${orderBy}
    LIMIT $${scope.nextIndex} OFFSET $${scope.nextIndex + 1}
  `;

  const countParams = [...params, ...scope.params];
  const dataParams = [...params, ...scope.params, limit, skip];

  const [countResult, subjects] = await Promise.all([
    db.raw(countQuery, countParams),
    db.raw(dataQuery, dataParams),
  ]);

  const total = parseInt(countResult[0].count, 10);

  return ApiResponse.paginated(
    res,
    subjects,
    getPaginationMeta(page, limit, total),
    'Subjects retrieved successfully'
  );
});

exports.getSubject = catchAsync(async (req, res) => {
  const subject = await db.findOne('subjects', { id: req.params.id });
  if (!subject) {
    throw new ApiError('Subject not found', 404);
  }

  if (req.user.role !== 'super_admin' && subject.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const [classes, allocations] = await Promise.all([
    db.raw(
      `
        SELECT c.id, c.name, c.numeric_name AS "numericName", c.academic_year_id AS "academicYear",
               ay.name AS "academicYearName"
        FROM classes c
        JOIN subject_applicable_classes sac ON c.id = sac.class_id
        JOIN academic_years ay ON c.academic_year_id = ay.id
        WHERE sac.subject_id = $1
      `,
      [subject.id]
    ),
    db.raw(
      `
        SELECT cs.id, cs.class_id AS class, cs.section_id AS section, cs.subject_id AS subject,
               cs.teacher_id AS teacher, cs.academic_year_id AS "academicYear", cs.weekly_periods AS "weeklyPeriods",
               cs.is_elective AS "isElective", cs.created_at AS "createdAt", cs.updated_at AS "updatedAt",
               c.name AS "className",
               t.first_name AS "teacherFirstName", t.last_name AS "teacherLastName", t.employee_id AS "teacherEmployeeId",
               ay.name AS "academicYearName"
        FROM class_subjects cs
        JOIN classes c ON cs.class_id = c.id
        LEFT JOIN teachers t ON cs.teacher_id = t.id
        JOIN academic_years ay ON cs.academic_year_id = ay.id
        WHERE cs.subject_id = $1
      `,
      [subject.id]
    ),
  ]);

  return ApiResponse.success(
    res,
    { subject, applicableClasses: classes, allocations },
    'Subject retrieved successfully'
  );
});

exports.createSubject = catchAsync(async (req, res) => {
  const {
    name,
    code,
    type,
    description,
    credits,
    maxMarks,
    passMarks,
    applicableClasses,
    status,
  } = req.body;

  const normalizedCode = code.toUpperCase();
  const existing = await db.findOne('subjects', {
    code: normalizedCode,
    school_id: req.user.school_id,
  });
  if (existing) {
    throw new ApiError('Subject with this code already exists', 409);
  }

  const subject = await db.insert('subjects', {
    name,
    code: normalizedCode,
    type,
    description,
    credits,
    max_marks: maxMarks,
    pass_marks: passMarks,
    status,
    school_id: req.user.school_id,
  });

  if (Array.isArray(applicableClasses) && applicableClasses.length > 0) {
    for (const classId of applicableClasses) {
      await db.insert('subject_applicable_classes', {
        subject_id: subject.id,
        class_id: classId,
        school_id: req.user.school_id,
      });
    }
  }

  return ApiResponse.success(res, { subject }, 'Subject created successfully', 201);
});

exports.updateSubject = catchAsync(async (req, res) => {
  const {
    name,
    code,
    type,
    description,
    credits,
    maxMarks,
    passMarks,
    applicableClasses,
    status,
  } = req.body;

  const subject = await db.findOne('subjects', { id: req.params.id });
  if (!subject) {
    throw new ApiError('Subject not found', 404);
  }

  if (req.user.role !== 'super_admin' && subject.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const updateData = {};

  if (code && code.toUpperCase() !== subject.code) {
    const existing = await db.findOne('subjects', {
      code: code.toUpperCase(),
      school_id: subject.school_id,
    });
    if (existing && existing.id !== subject.id) {
      throw new ApiError('Subject with this code already exists', 409);
    }
    updateData.code = code.toUpperCase();
  }

  if (name) updateData.name = name;
  if (type) updateData.type = type;
  if (description !== undefined) updateData.description = description;
  if (credits !== undefined) updateData.credits = credits;
  if (maxMarks !== undefined) updateData.max_marks = maxMarks;
  if (passMarks !== undefined) updateData.pass_marks = passMarks;
  if (status) updateData.status = status;

  const [updated] = await db.update('subjects', updateData, { id: subject.id });

  if (Array.isArray(applicableClasses)) {
    await db.delete('subject_applicable_classes', { subject_id: subject.id });
    for (const classId of applicableClasses) {
      await db.insert('subject_applicable_classes', {
        subject_id: subject.id,
        class_id: classId,
        school_id: subject.school_id,
      });
    }
  }

  return ApiResponse.success(res, { subject: updated }, 'Subject updated successfully');
});

exports.deleteSubject = catchAsync(async (req, res) => {
  const subject = await db.findOne('subjects', { id: req.params.id });
  if (!subject) {
    throw new ApiError('Subject not found', 404);
  }

  if (req.user.role !== 'super_admin' && subject.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const allocations = await db.count('class_subjects', { subject_id: subject.id });
  if (allocations > 0) {
    throw new ApiError(
      `Cannot delete subject. It is allocated to ${allocations} class-subject record(s).`,
      409
    );
  }

  const timetableCount = await db.count('timetable_entries', { subject_id: subject.id });
  if (timetableCount > 0) {
    throw new ApiError(
      `Cannot delete subject. It is used in ${timetableCount} timetable entry(ies).`,
      409
    );
  }

  await db.update('subjects', { status: 'inactive' }, { id: subject.id });
  return ApiResponse.success(res, null, 'Subject deleted successfully');
});

// ---------- Allocate subject to class (convenience endpoint) ----------

exports.allocateToClass = catchAsync(async (req, res) => {
  const subjectId = req.params.id;
  const { classId, sectionId, teacherId, weeklyPeriods, isElective, academicYear } = req.body;

  const [subject, classDoc] = await Promise.all([
    db.findOne('subjects', { id: subjectId }),
    db.findOne('classes', { id: classId }),
  ]);

  if (!subject) {
    throw new ApiError('Subject not found', 404);
  }
  if (!classDoc) {
    throw new ApiError('Class not found', 404);
  }

  if (req.user.role !== 'super_admin') {
    if (subject.school_id !== req.user.school_id || classDoc.school_id !== req.user.school_id) {
      throw new ApiError('Access denied', 403);
    }
  }

  const section = await db.findOne('class_sections', {
    id: sectionId,
    class_id: classId,
  });
  if (!section) {
    throw new ApiError('Section not found in this class', 404);
  }

  const resolvedAcademicYear = academicYear || classDoc.academic_year_id;

  const existing = await db.findOne('class_subjects', {
    class_id: classId,
    section_id: sectionId,
    subject_id: subjectId,
    academic_year_id: resolvedAcademicYear,
  });
  if (existing) {
    throw new ApiError('Subject already allocated to this class-section for this academic year', 409);
  }

  const allocation = await db.insert('class_subjects', {
    class_id: classId,
    section_id: sectionId,
    subject_id: subjectId,
    teacher_id: teacherId || null,
    academic_year_id: resolvedAcademicYear,
    weekly_periods: weeklyPeriods || 5,
    is_elective: !!isElective,
    school_id: classDoc.school_id,
  });

  const existingApplicable = await db.findOne('subject_applicable_classes', {
    subject_id: subjectId,
    class_id: classId,
  });
  if (!existingApplicable) {
    await db.insert('subject_applicable_classes', {
      subject_id: subjectId,
      class_id: classId,
      school_id: classDoc.school_id,
    });
  }

  const populated = await db.raw(
    `
      SELECT cs.*,
             c.id AS "classId", c.name AS "className", c.numeric_name AS "classNumericName",
             s.id AS "subjectId", s.name AS "subjectName", s.code AS "subjectCode", s.type AS "subjectType",
             t.id AS "teacherId", t.first_name AS "teacherFirstName", t.last_name AS "teacherLastName", t.employee_id AS "teacherEmployeeId",
             ay.id AS "academicYearId", ay.name AS "academicYearName"
      FROM class_subjects cs
      JOIN classes c ON cs.class_id = c.id
      JOIN subjects s ON cs.subject_id = s.id
      LEFT JOIN teachers t ON cs.teacher_id = t.id
      JOIN academic_years ay ON cs.academic_year_id = ay.id
      WHERE cs.id = $1
    `,
    [allocation.id]
  );

  const populatedRow = populated[0];

  return ApiResponse.success(
    res,
    {
      allocation: {
        id: populatedRow.id,
        class: {
          id: populatedRow.classId,
          name: populatedRow.className,
          numericName: populatedRow.classNumericName,
          academicYear: populatedRow.academicYearId,
        },
        section: populatedRow.section_id,
        sectionName: section.name,
        subject: {
          id: populatedRow.subjectId,
          name: populatedRow.subjectName,
          code: populatedRow.subjectCode,
          type: populatedRow.subjectType,
        },
        teacher: populatedRow.teacherId
          ? {
              id: populatedRow.teacherId,
              firstName: populatedRow.teacherFirstName,
              lastName: populatedRow.teacherLastName,
              employeeId: populatedRow.teacherEmployeeId,
            }
          : null,
        academicYear: {
          id: populatedRow.academicYearId,
          name: populatedRow.academicYearName,
        },
        weeklyPeriods: populatedRow.weekly_periods,
        isElective: populatedRow.is_elective,
        createdAt: populatedRow.created_at,
        updatedAt: populatedRow.updated_at,
      },
    },
    'Subject allocated to class successfully',
    201
  );
});
