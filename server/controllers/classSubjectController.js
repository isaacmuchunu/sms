const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { scopeBySchool, getSchoolFilter } = require('../middleware/auth');
const { buildOrderBy } = require('../utils/sort');

const BASE_SELECT = `
  SELECT
    cs.id, cs.school_id, cs.class_id, cs.section_id, cs.subject_id, cs.teacher_id, cs.academic_year_id,
    cs.weekly_periods, cs.is_elective, cs.created_at, cs.updated_at,
    c.name AS class_name,
    c.academic_year_id AS class_academic_year_id,
    sec.name AS section_name,
    s.name AS subject_name,
    s.code AS subject_code,
    s.type AS subject_type,
    t.first_name AS teacher_first_name,
    t.last_name AS teacher_last_name,
    t.employee_id AS teacher_employee_id,
    ay.name AS academic_year_name,
    (
      SELECT json_agg(json_build_object('id', sec2.id, 'name', sec2.name))
      FROM class_sections sec2
      WHERE sec2.class_id = c.id
    ) AS class_sections
  FROM class_subjects cs
  JOIN classes c ON c.id = cs.class_id
  JOIN class_sections sec ON sec.id = cs.section_id
  JOIN subjects s ON s.id = cs.subject_id
  LEFT JOIN teachers t ON t.id = cs.teacher_id
  JOIN academic_years ay ON ay.id = cs.academic_year_id
`;

const formatAllocation = (row) => ({
  _id: row.id,
  class: {
    _id: row.class_id,
    name: row.class_name,
    sections: Array.isArray(row.class_sections)
      ? row.class_sections.map((sec) => ({ _id: sec.id, name: sec.name }))
      : [],
    academicYear: row.class_academic_year_id,
  },
  section: row.section_id,
  sectionName: row.section_name || null,
  subject: {
    _id: row.subject_id,
    name: row.subject_name,
    code: row.subject_code,
    type: row.subject_type,
  },
  teacher: row.teacher_id
    ? {
        _id: row.teacher_id,
        firstName: row.teacher_first_name,
        lastName: row.teacher_last_name,
        employeeId: row.teacher_employee_id,
      }
    : null,
  academicYear: {
    _id: row.academic_year_id,
    name: row.academic_year_name,
  },
  weeklyPeriods: row.weekly_periods,
  isElective: row.is_elective,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const CLASS_SUBJECT_SORT_ALLOWLIST = {
  createdAt: 'cs.created_at',
  updatedAt: 'cs.updated_at',
  weeklyPeriods: 'cs.weekly_periods',
  isElective: 'cs.is_elective',
};

const buildFilter = async (query, req) => {
  const {
    class: classId,
    section,
    subject,
    teacher,
    academicYear,
    isElective,
    search,
  } = query;

  const conditions = [];
  const params = [];

  const schoolScope = scopeBySchool(req, 0);
  if (schoolScope.clause !== '1=1') {
    conditions.push(`cs.${schoolScope.clause}`);
  }
  params.push(...schoolScope.params);

  if (classId) {
    conditions.push(`cs.class_id = $${params.length + 1}`);
    params.push(classId);
  }
  if (section) {
    conditions.push(`cs.section_id = $${params.length + 1}`);
    params.push(section);
  }
  if (teacher) {
    conditions.push(`cs.teacher_id = $${params.length + 1}`);
    params.push(teacher);
  }
  if (academicYear) {
    conditions.push(`cs.academic_year_id = $${params.length + 1}`);
    params.push(academicYear);
  }
  if (isElective !== undefined) {
    conditions.push(`cs.is_elective = $${params.length + 1}`);
    params.push(isElective === 'true');
  }

  if (search) {
    const term = `%${search}%`;
    conditions.push(
      `cs.subject_id IN (
        SELECT id FROM subjects
        WHERE name ILIKE $${params.length + 1} OR code ILIKE $${params.length + 2}
      )`
    );
    params.push(term, term);
  } else if (subject) {
    conditions.push(`cs.subject_id = $${params.length + 1}`);
    params.push(subject);
  }

  const whereStr = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereStr, params };
};

const fetchAllocationById = async (id) => {
  const rows = await db.raw(`${BASE_SELECT} WHERE cs.id = $1 LIMIT 1`, [id]);
  return rows[0] ? formatAllocation(rows[0]) : null;
};

const fetchClassSubjects = async (query, req) => {
  const { page, limit, skip } = getPagination(query);
  const { sort = 'createdAt' } = query;

  const { whereStr, params } = await buildFilter(query, req);

  let selectQuery = `${BASE_SELECT} ${whereStr} ORDER BY ${buildOrderBy(sort, undefined, CLASS_SUBJECT_SORT_ALLOWLIST, 'cs.created_at ASC')}`;
  const suffixParams = [];
  if (limit) {
    selectQuery += ` LIMIT $${params.length + suffixParams.length + 1}`;
    suffixParams.push(limit);
  }
  if (skip) {
    selectQuery += ` OFFSET $${params.length + suffixParams.length + 1}`;
    suffixParams.push(skip);
  }

  const [rows, total] = await Promise.all([
    db.raw(selectQuery, [...params, ...suffixParams]),
    db.raw(
      `SELECT COUNT(*) AS count FROM class_subjects cs
       JOIN classes c ON c.id = cs.class_id
       JOIN class_sections sec ON sec.id = cs.section_id
       JOIN subjects s ON s.id = cs.subject_id
       LEFT JOIN teachers t ON t.id = cs.teacher_id
       JOIN academic_years ay ON ay.id = cs.academic_year_id
       ${whereStr}`,
      params
    ).then((r) => parseInt(r[0].count, 10)),
  ]);

  return {
    items: rows.map(formatAllocation),
    meta: getPaginationMeta(page, limit, total),
  };
};

exports.getClassSubjects = catchAsync(async (req, res) => {
  const { items, meta } = await fetchClassSubjects(req.query, req);
  return ApiResponse.paginated(
    res,
    items,
    meta,
    'Class-subject allocations retrieved successfully'
  );
});

exports.getClassSubject = catchAsync(async (req, res) => {
  const rows = await db.raw(`${BASE_SELECT} WHERE cs.id = $1 LIMIT 1`, [req.params.id]);
  const row = rows[0];
  if (!row) {
    throw new ApiError('Allocation not found', 404);
  }

  if (req.user.role !== 'super_admin' && row.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const allocation = formatAllocation(row);

  return ApiResponse.success(
    res,
    { allocation },
    'Allocation retrieved successfully'
  );
});

exports.createClassSubject = catchAsync(async (req, res) => {
  const classId = req.body.class || req.params.id;
  const { section, subject, teacher, academicYear, weeklyPeriods, isElective } = req.body;
  const schoolFilter = getSchoolFilter(req);
  const schoolId = schoolFilter.school_id || req.user.school_id;

  if (!classId) {
    throw new ApiError('Class is required', 400);
  }

  const [classDoc, subj, sec] = await Promise.all([
    db.findOne('classes', { id: classId }),
    db.findOne('subjects', { id: subject }),
    db.findOne('class_sections', { id: section, class_id: classId }),
  ]);

  if (!classDoc || classDoc.school_id !== schoolId) {
    throw new ApiError('Class not found', 404);
  }
  if (!subj || subj.school_id !== schoolId) {
    throw new ApiError('Subject not found', 404);
  }
  if (!sec || sec.school_id !== schoolId) {
    throw new ApiError('Section not found in this class', 404);
  }

  const existing = await db.findOne('class_subjects', {
    class_id: classId,
    section_id: section,
    subject_id: subject,
    academic_year_id: academicYear,
  });
  if (existing) {
    throw new ApiError(
      'Subject already allocated to this class-section for this academic year',
      409
    );
  }

  const allocation = await db.insert('class_subjects', {
    class_id: classId,
    section_id: section,
    subject_id: subject,
    teacher_id: teacher || null,
    academic_year_id: academicYear,
    weekly_periods: weeklyPeriods,
    is_elective: !!isElective,
    school_id: schoolId,
  });

  const applicable = await db.findOne('subject_applicable_classes', {
    subject_id: subject,
    class_id: classId,
  });
  if (!applicable) {
    await db.insert('subject_applicable_classes', {
      subject_id: subject,
      class_id: classId,
      school_id: schoolId,
    });
  }

  const populated = await fetchAllocationById(allocation.id);

  return ApiResponse.success(
    res,
    { allocation: populated },
    'Class-subject allocation created successfully',
    201
  );
});

exports.updateClassSubject = catchAsync(async (req, res) => {
  const { teacher, weeklyPeriods, isElective } = req.body;

  const allocation = await db.findOne('class_subjects', { id: req.params.id });
  if (!allocation) {
    throw new ApiError('Allocation not found', 404);
  }

  if (req.user.role !== 'super_admin' && allocation.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const data = {};
  if (teacher !== undefined) data.teacher_id = teacher || null;
  if (weeklyPeriods !== undefined) data.weekly_periods = weeklyPeriods;
  if (isElective !== undefined) data.is_elective = isElective;

  if (Object.keys(data).length > 0) {
    await db.update('class_subjects', data, { id: req.params.id });
  }

  const populated = await fetchAllocationById(req.params.id);

  return ApiResponse.success(
    res,
    { allocation: populated },
    'Allocation updated successfully'
  );
});

exports.deleteClassSubject = catchAsync(async (req, res) => {
  const allocation = await db.findOne('class_subjects', { id: req.params.id });
  if (!allocation) {
    throw new ApiError('Allocation not found', 404);
  }

  if (req.user.role !== 'super_admin' && allocation.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const entries = await db.count('timetable_entries', {
    class_id: allocation.class_id,
    section_id: allocation.section_id,
    subject_id: allocation.subject_id,
  });
  if (entries > 0) {
    throw new ApiError('Cannot delete allocation. Timetable entries exist for it.', 409);
  }

  await db.delete('class_subjects', { id: req.params.id });
  return ApiResponse.success(res, null, 'Allocation deleted successfully');
});

// ---------- Nested use from classes route ----------

exports.getByClass = catchAsync(async (req, res) => {
  const query = { ...req.query, class: req.params.id };
  const { items, meta } = await fetchClassSubjects(query, req);
  return ApiResponse.paginated(
    res,
    items,
    meta,
    'Class-subject allocations retrieved successfully'
  );
});
