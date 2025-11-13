const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { scopeBySchool } = require('../middleware/auth');
const { buildOrderBy } = require('../utils/sort');

const scopedSchoolClause = (scope, alias) =>
  scope.clause === '1=1' ? '1=1' : `${alias}.${scope.clause}`;

// ---------- Helpers ----------

const mapStudent = (s) => ({
  _id: s.id,
  firstName: s.first_name,
  lastName: s.last_name,
  rollNo: s.roll_no,
  admissionNo: s.admission_no,
  gender: s.gender,
  section: s.section_id,
  status: s.status,
});

const buildSectionObject = (sec, studentCount = 0) => ({
  _id: sec.id,
  name: sec.name,
  classTeacher: sec.class_teacher_id
    ? {
        _id: sec.class_teacher_id,
        firstName: sec.first_name,
        lastName: sec.last_name,
        employeeId: sec.employee_id,
      }
    : null,
  capacity: sec.capacity,
  roomNumber: sec.room_number,
  status: sec.status,
  studentCount,
});

const fetchPopulatedClass = async (classId) => {
  const rows = await db.raw(
    `SELECT c.*, ay.id AS ay_id, ay.name AS ay_name, ay.is_current AS ay_is_current
     FROM classes c
     JOIN academic_years ay ON ay.id = c.academic_year_id
     WHERE c.id = $1`,
    [classId]
  );
  if (!rows.length) return null;

  const c = rows[0];
  const [sections, subjects] = await Promise.all([
    db.raw(
      `SELECT cs.*, t.first_name, t.last_name, t.employee_id
       FROM class_sections cs
       LEFT JOIN teachers t ON t.id = cs.class_teacher_id
       WHERE cs.class_id = $1
       ORDER BY cs.name`,
      [classId]
    ),
    db.raw(
      `SELECT s.*
       FROM subjects s
       JOIN subject_applicable_classes sac ON sac.subject_id = s.id
       WHERE sac.class_id = $1`,
      [classId]
    ),
  ]);

  return {
    _id: c.id,
    name: c.name,
    numericName: c.numeric_name,
    monthlyFee: c.monthly_fee,
    status: c.status,
    academicYear: {
      _id: c.ay_id,
      name: c.ay_name,
      isCurrent: c.ay_is_current,
    },
    subjects: subjects.map((s) => ({
      _id: s.id,
      name: s.name,
      code: s.code,
      type: s.type,
      status: s.status,
    })),
    sections: sections.map((sec) => buildSectionObject(sec)),
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
};

const checkClassTeacherConflict = async (classRow, teacherId, excludeSectionId = null) => {
  if (!teacherId) return;

  const conflictInOtherClass = await db.raw(
    `SELECT cs.id
     FROM class_sections cs
     JOIN classes c ON c.id = cs.class_id
     WHERE cs.class_teacher_id = $1
       AND c.academic_year_id = $2
       AND cs.class_id != $3
     LIMIT 1`,
    [teacherId, classRow.academic_year_id, classRow.id]
  );
  if (conflictInOtherClass.length) {
    throw new ApiError('Teacher already assigned as class teacher in another section', 409);
  }

  let query = `SELECT id FROM class_sections WHERE class_teacher_id = $1 AND class_id = $2`;
  const params = [teacherId, classRow.id];
  if (excludeSectionId) {
    query += ` AND id != $3`;
    params.push(excludeSectionId);
  }
  query += ` LIMIT 1`;

  const sameClassConflict = await db.raw(query, params);
  if (sameClassConflict.length) {
    throw new ApiError('Teacher already assigned to another section in this class', 409);
  }
};

// ---------- Classes ----------

const CLASS_SORT_ALLOWLIST = {
  numericName: 'c.numeric_name',
  name: 'c.name',
  status: 'c.status',
  createdAt: 'c.created_at',
};

exports.getClasses = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { search, academicYear, status, sort = 'numericName' } = req.query;

  const orderBy = buildOrderBy(sort, undefined, CLASS_SORT_ALLOWLIST, 'c.numeric_name ASC');
  const searchPattern = search ? `%${search}%` : null;

  const scope = scopeBySchool(req, 3);
  const schoolFilter = scopedSchoolClause(scope, 'c');

  const classes = await db.raw(
    `SELECT DISTINCT c.*, ay.id AS ay_id, ay.name AS ay_name, ay.is_current AS ay_is_current
     FROM classes c
     JOIN academic_years ay ON ay.id = c.academic_year_id
     LEFT JOIN class_sections cs ON cs.class_id = c.id
     WHERE ($1::uuid IS NULL OR c.academic_year_id = $1)
       AND ($2::text IS NULL OR c.status = $2)
       AND ($3::text IS NULL OR c.name ILIKE $3 OR cs.name ILIKE $3)
       AND ${schoolFilter}
     ORDER BY ${orderBy}
     LIMIT $${scope.nextIndex} OFFSET $${scope.nextIndex + 1}`,
    [academicYear || null, status || null, searchPattern, ...scope.params, limit, skip]
  );

  const [{ count }] = await db.raw(
    `SELECT COUNT(DISTINCT c.id) AS count
     FROM classes c
     LEFT JOIN class_sections cs ON cs.class_id = c.id
     WHERE ($1::uuid IS NULL OR c.academic_year_id = $1)
       AND ($2::text IS NULL OR c.status = $2)
       AND ($3::text IS NULL OR c.name ILIKE $3 OR cs.name ILIKE $3)
       AND ${schoolFilter}`,
    [academicYear || null, status || null, searchPattern, ...scope.params]
  );
  const total = parseInt(count, 10);

  const classIds = classes.map((c) => c.id);
  const [sections, subjects, studentCounts] = await Promise.all([
    classIds.length
      ? db.raw(
          `SELECT cs.*, t.first_name, t.last_name, t.employee_id
           FROM class_sections cs
           LEFT JOIN teachers t ON t.id = cs.class_teacher_id
           WHERE cs.class_id = ANY($1::uuid[])
           ORDER BY cs.name`,
          [classIds]
        )
      : [],
    classIds.length
      ? db.raw(
          `SELECT s.*, sac.class_id
           FROM subjects s
           JOIN subject_applicable_classes sac ON sac.subject_id = s.id
           WHERE sac.class_id = ANY($1::uuid[])`,
          [classIds]
        )
      : [],
    classIds.length
      ? db.raw(
          `SELECT section_id, COUNT(*) AS count
           FROM students
           WHERE class_id = ANY($1::uuid[]) AND status = 'active'
           GROUP BY section_id`,
          [classIds]
        )
      : [],
  ]);

  const sectionsByClass = sections.reduce((acc, sec) => {
    acc[sec.class_id] = acc[sec.class_id] || [];
    acc[sec.class_id].push(sec);
    return acc;
  }, {});

  const subjectsByClass = subjects.reduce((acc, subj) => {
    acc[subj.class_id] = acc[subj.class_id] || [];
    acc[subj.class_id].push(subj);
    return acc;
  }, {});

  const countMap = Object.fromEntries(
    studentCounts.map((c) => [c.section_id, parseInt(c.count, 10)])
  );

  const classesWithCounts = classes.map((c) => {
    const classSections = sectionsByClass[c.id] || [];
    const classSubjects = subjectsByClass[c.id] || [];
    return {
      _id: c.id,
      name: c.name,
      numericName: c.numeric_name,
      monthlyFee: c.monthly_fee,
      status: c.status,
      academicYear: {
        _id: c.ay_id,
        name: c.ay_name,
        isCurrent: c.ay_is_current,
      },
      subjects: classSubjects.map((s) => ({
        _id: s.id,
        name: s.name,
        code: s.code,
        type: s.type,
        status: s.status,
      })),
      sections: classSections.map((sec) =>
        buildSectionObject(sec, countMap[sec.id] || 0)
      ),
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    };
  });

  return ApiResponse.paginated(
    res,
    classesWithCounts,
    getPaginationMeta(page, limit, total),
    'Classes retrieved successfully'
  );
});

exports.getClass = catchAsync(async (req, res) => {
  const classDoc = await fetchPopulatedClass(req.params.id);
  if (!classDoc) {
    throw new ApiError('Class not found', 404);
  }

  const classRow = await db.findOne('classes', { id: req.params.id });
  if (req.user.role !== 'super_admin' && classRow.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const students = await db.raw(
    `SELECT id, first_name, last_name, roll_no, admission_no, gender, section_id, status
     FROM students
     WHERE class_id = $1 AND status = 'active'
     ORDER BY roll_no`,
    [req.params.id]
  );

  const sectionMap = Object.fromEntries(
    classDoc.sections.map((s) => [s._id, s.name])
  );
  const studentsWithSection = students.map((s) => ({
    ...mapStudent(s),
    sectionName: sectionMap[s.section_id] || null,
  }));

  return ApiResponse.success(
    res,
    { class: classDoc, students: studentsWithSection },
    'Class retrieved successfully'
  );
});

exports.createClass = catchAsync(async (req, res) => {
  const { name, numericName, academicYear, monthlyFee, status, subjects, sections } = req.body;

  const existing = await db.findOne('classes', {
    name,
    academic_year_id: academicYear,
    school_id: req.user.school_id,
  });
  if (existing) {
    throw new ApiError(`Class ${name} already exists for this academic year`, 409);
  }

  if (sections?.length) {
    const names = sections.map((s) => s.name.toUpperCase());
    if (new Set(names).size !== names.length) {
      throw new ApiError('Duplicate section names within class', 400);
    }
  }

  const classRow = await db.insert('classes', {
    name,
    numeric_name: numericName,
    academic_year_id: academicYear,
    monthly_fee: monthlyFee ?? 0,
    status: status || 'active',
    school_id: req.user.school_id,
  });

  if (sections?.length) {
    for (const s of sections) {
      await db.insert('class_sections', {
        class_id: classRow.id,
        name: s.name.toUpperCase(),
        class_teacher_id: s.classTeacher || null,
        capacity: s.capacity ?? 40,
        room_number: s.roomNumber || '',
        status: s.status || 'active',
        school_id: req.user.school_id,
      });
    }
  }

  if (subjects?.length) {
    for (const subjectId of subjects) {
      await db.insert('subject_applicable_classes', {
        class_id: classRow.id,
        subject_id: subjectId,
        school_id: req.user.school_id,
      });
    }
  }

  const populated = await fetchPopulatedClass(classRow.id);
  return ApiResponse.success(
    res,
    { class: populated },
    'Class created successfully',
    201
  );
});

exports.updateClass = catchAsync(async (req, res) => {
  const { name, numericName, academicYear, monthlyFee, status, subjects } = req.body;

  const classRow = await db.findOne('classes', { id: req.params.id });
  if (!classRow) {
    throw new ApiError('Class not found', 404);
  }

  if (req.user.role !== 'super_admin' && classRow.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  if (
    (name && name !== classRow.name) ||
    (academicYear && academicYear !== classRow.academic_year_id)
  ) {
    const dup = await db.raw(
      `SELECT id FROM classes
       WHERE name = $1 AND academic_year_id = $2 AND id != $3 AND school_id = $4
       LIMIT 1`,
      [name || classRow.name, academicYear || classRow.academic_year_id, req.params.id, classRow.school_id]
    );
    if (dup.length) {
      throw new ApiError('Class name already exists for this academic year', 409);
    }
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (numericName !== undefined) updateData.numeric_name = numericName;
  if (academicYear) updateData.academic_year_id = academicYear;
  if (monthlyFee !== undefined) updateData.monthly_fee = monthlyFee;
  if (status) updateData.status = status;

  await db.update('classes', updateData, { id: req.params.id });

  const populated = await fetchPopulatedClass(req.params.id);
  return ApiResponse.success(res, { class: populated }, 'Class updated successfully');
});

exports.deleteClass = catchAsync(async (req, res) => {
  const classRow = await db.findOne('classes', { id: req.params.id });
  if (!classRow) {
    throw new ApiError('Class not found', 404);
  }

  if (req.user.role !== 'super_admin' && classRow.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const activeStudents = await db.count('students', {
    class_id: req.params.id,
    status: 'active',
  });

  if (activeStudents > 0) {
    await db.update('classes', { status: 'inactive' }, { id: req.params.id });
    return ApiResponse.success(
      res,
      null,
      `Class archived successfully (had ${activeStudents} active students)`
    );
  }

  await db.delete('classes', { id: req.params.id });
  return ApiResponse.success(res, null, 'Class deleted successfully');
});

// ---------- Sections ----------

exports.getSections = catchAsync(async (req, res) => {
  const classRow = await db.findOne('classes', { id: req.params.id });
  if (!classRow) {
    throw new ApiError('Class not found', 404);
  }

  if (req.user.role !== 'super_admin' && classRow.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const sections = await db.raw(
    `SELECT cs.*, t.first_name, t.last_name, t.employee_id
     FROM class_sections cs
     LEFT JOIN teachers t ON t.id = cs.class_teacher_id
     WHERE cs.class_id = $1
     ORDER BY cs.name`,
    [req.params.id]
  );

  const sectionIds = sections.map((s) => s.id);
  const counts = sectionIds.length
    ? await db.raw(
        `SELECT section_id, COUNT(*) AS count
         FROM students
         WHERE class_id = $1 AND section_id = ANY($2::uuid[]) AND status = 'active'
         GROUP BY section_id`,
        [req.params.id, sectionIds]
      )
    : [];

  const countMap = Object.fromEntries(
    counts.map((c) => [c.section_id, parseInt(c.count, 10)])
  );
  const sectionsWithCounts = sections.map((sec) =>
    buildSectionObject(sec, countMap[sec.id] || 0)
  );

  return ApiResponse.success(
    res,
    { sections: sectionsWithCounts },
    'Sections retrieved successfully'
  );
});

exports.getSection = catchAsync(async (req, res) => {
  const classRow = await db.findOne('classes', { id: req.params.id });
  if (!classRow) {
    throw new ApiError('Class not found', 404);
  }

  if (req.user.role !== 'super_admin' && classRow.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const sectionRows = await db.raw(
    `SELECT cs.*, t.first_name, t.last_name, t.employee_id
     FROM class_sections cs
     LEFT JOIN teachers t ON t.id = cs.class_teacher_id
     WHERE cs.id = $1 AND cs.class_id = $2
     LIMIT 1`,
    [req.params.sectionId, req.params.id]
  );
  if (!sectionRows.length) {
    throw new ApiError('Section not found', 404);
  }
  const section = sectionRows[0];

  const [studentCount, students] = await Promise.all([
    db.count('students', {
      class_id: req.params.id,
      section_id: section.id,
      status: 'active',
    }),
    db.raw(
      `SELECT id, first_name, last_name, roll_no, admission_no, gender, section_id, status
       FROM students
       WHERE class_id = $1 AND section_id = $2
       ORDER BY roll_no`,
      [req.params.id, section.id]
    ),
  ]);

  return ApiResponse.success(
    res,
    {
      section: buildSectionObject(section, studentCount),
      students: students.map(mapStudent),
    },
    'Section retrieved successfully'
  );
});

exports.addSection = catchAsync(async (req, res) => {
  const classRow = await db.findOne('classes', { id: req.params.id });
  if (!classRow) {
    throw new ApiError('Class not found', 404);
  }

  if (req.user.role !== 'super_admin' && classRow.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const { name, classTeacher, capacity, roomNumber, status } = req.body;

  const existing = await db.raw(
    `SELECT id FROM class_sections WHERE class_id = $1 AND UPPER(name) = $2 LIMIT 1`,
    [req.params.id, name.toUpperCase()]
  );
  if (existing.length) {
    throw new ApiError(`Section ${name} already exists`, 409);
  }

  await checkClassTeacherConflict(classRow, classTeacher);

  await db.insert('class_sections', {
    class_id: req.params.id,
    name: name.toUpperCase(),
    class_teacher_id: classTeacher || null,
    capacity: capacity ?? 40,
    room_number: roomNumber || '',
    status: status || 'active',
    school_id: classRow.school_id,
  });

  const populated = await fetchPopulatedClass(req.params.id);
  return ApiResponse.success(
    res,
    { class: populated },
    'Section added successfully',
    201
  );
});

exports.updateSection = catchAsync(async (req, res) => {
  const classRow = await db.findOne('classes', { id: req.params.id });
  if (!classRow) {
    throw new ApiError('Class not found', 404);
  }

  if (req.user.role !== 'super_admin' && classRow.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const sectionRows = await db.raw(
    `SELECT * FROM class_sections WHERE id = $1 AND class_id = $2 LIMIT 1`,
    [req.params.sectionId, req.params.id]
  );
  if (!sectionRows.length) {
    throw new ApiError('Section not found', 404);
  }
  const section = sectionRows[0];

  const { name, classTeacher, capacity, roomNumber, status } = req.body;

  if (name && name.toUpperCase() !== section.name.toUpperCase()) {
    const dup = await db.raw(
      `SELECT id FROM class_sections
       WHERE class_id = $1 AND UPPER(name) = $2 AND id != $3
       LIMIT 1`,
      [req.params.id, name.toUpperCase(), section.id]
    );
    if (dup.length) {
      throw new ApiError(`Section ${name} already exists`, 409);
    }
  }

  const updateData = {};
  if (name) updateData.name = name.toUpperCase();
  if (capacity !== undefined) {
    const studentCount = await db.count('students', {
      class_id: req.params.id,
      section_id: section.id,
      status: 'active',
    });
    if (capacity < studentCount) {
      throw new ApiError(
        `Capacity cannot be below current enrollment (${studentCount})`,
        400
      );
    }
    updateData.capacity = capacity;
  }

  if (classTeacher !== undefined) {
    if (classTeacher && classTeacher !== section.class_teacher_id) {
      await checkClassTeacherConflict(classRow, classTeacher, section.id);
    }
    updateData.class_teacher_id = classTeacher || null;
  }

  if (roomNumber !== undefined) updateData.room_number = roomNumber;
  if (status) updateData.status = status;

  await db.update('class_sections', updateData, { id: section.id });

  const populated = await fetchPopulatedClass(req.params.id);
  const updatedSection = populated.sections.find((s) => s._id === section.id);
  return ApiResponse.success(
    res,
    { section: updatedSection },
    'Section updated successfully'
  );
});

exports.deleteSection = catchAsync(async (req, res) => {
  const classRow = await db.findOne('classes', { id: req.params.id });
  if (!classRow) {
    throw new ApiError('Class not found', 404);
  }

  if (req.user.role !== 'super_admin' && classRow.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const sectionRows = await db.raw(
    `SELECT * FROM class_sections WHERE id = $1 AND class_id = $2 LIMIT 1`,
    [req.params.sectionId, req.params.id]
  );
  if (!sectionRows.length) {
    throw new ApiError('Section not found', 404);
  }
  const section = sectionRows[0];

  const count = await db.count('students', {
    class_id: req.params.id,
    section_id: section.id,
    status: 'active',
  });
  if (count > 0) {
    throw new ApiError('Cannot delete section with enrolled students', 409);
  }

  await db.update('class_sections', { status: 'inactive' }, { id: section.id });
  return ApiResponse.success(res, null, 'Section deleted successfully');
});

// ---------- Class timetable view ----------

exports.getClassTimetable = catchAsync(async (req, res) => {
  const classRow = await db.findOne('classes', { id: req.params.id });
  if (!classRow) {
    throw new ApiError('Class not found', 404);
  }

  if (req.user.role !== 'super_admin' && classRow.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const { section, academicYear } = req.query;
  const academicYearId = academicYear || classRow.academic_year_id;

  const params = [req.params.id, academicYearId];
  let query = `
    SELECT te.*,
           s.name AS subject_name, s.code AS subject_code,
           t.first_name AS teacher_first_name, t.last_name AS teacher_last_name, t.employee_id AS teacher_employee_id,
           ay.name AS ay_name
    FROM timetable_entries te
    JOIN subjects s ON s.id = te.subject_id
    JOIN teachers t ON t.id = te.teacher_id
    JOIN academic_years ay ON ay.id = te.academic_year_id
    WHERE te.class_id = $1 AND te.academic_year_id = $2
  `;
  if (section) {
    query += ` AND te.section_id = $3`;
    params.push(section);
  }
  query += ` ORDER BY te.day_of_week ASC, te.period_number ASC`;

  const entries = await db.raw(query, params);

  const sections = await db.raw(
    `SELECT id, name FROM class_sections WHERE class_id = $1`,
    [req.params.id]
  );
  const sectionMap = Object.fromEntries(
    sections.map((s) => [s.id, s.name])
  );

  const timetable = entries.map((entry) => ({
    _id: entry.id,
    academicYear: { _id: entry.academic_year_id, name: entry.ay_name },
    class: entry.class_id,
    section: entry.section_id,
    subject: {
      _id: entry.subject_id,
      name: entry.subject_name,
      code: entry.subject_code,
    },
    teacher: {
      _id: entry.teacher_id,
      firstName: entry.teacher_first_name,
      lastName: entry.teacher_last_name,
      employeeId: entry.teacher_employee_id,
    },
    dayOfWeek: entry.day_of_week,
    periodNumber: entry.period_number,
    startTime: entry.start_time,
    endTime: entry.end_time,
    roomNumber: entry.room_number,
    type: entry.type,
    isRecurring: entry.is_recurring,
    effectiveDate: entry.effective_date,
    sectionName: sectionMap[entry.section_id] || null,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  }));

  return ApiResponse.success(
    res,
    { timetable },
    'Class timetable retrieved successfully'
  );
});
