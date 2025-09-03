const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { getSchoolFilter, scopeBySchool } = require('../middleware/auth');
const { buildOrderBy } = require('../utils/sort');

// Maps request/response camelCase names to PostgreSQL snake_case columns.
const fieldMap = {
  academicYear: 'academic_year_id',
  class: 'class_id',
  section: 'section_id',
  subject: 'subject_id',
  teacher: 'teacher_id',
  dayOfWeek: 'day_of_week',
  periodNumber: 'period_number',
  startTime: 'start_time',
  endTime: 'end_time',
  roomNumber: 'room_number',
  type: 'type',
  isRecurring: 'is_recurring',
  effectiveDate: 'effective_date',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const minutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const baseEntrySelect = `
  SELECT
    te.*,
    c.name AS class_name,
    c.academic_year_id AS class_academic_year_id,
    cs.name AS section_name,
    s.name AS subject_name,
    s.code AS subject_code,
    s.type AS subject_type,
    t.first_name AS teacher_first_name,
    t.last_name AS teacher_last_name,
    t.employee_id AS teacher_employee_id,
    ay.name AS academic_year_name
  FROM timetable_entries te
  JOIN classes c ON c.id = te.class_id
  JOIN class_sections cs ON cs.id = te.section_id
  JOIN subjects s ON s.id = te.subject_id
  JOIN teachers t ON t.id = te.teacher_id
  JOIN academic_years ay ON ay.id = te.academic_year_id
`;

const TIMETABLE_SORT_ALLOWLIST = {
  academicYear: 'te.academic_year_id',
  class: 'te.class_id',
  section: 'te.section_id',
  subject: 'te.subject_id',
  teacher: 'te.teacher_id',
  dayOfWeek: 'te.day_of_week',
  periodNumber: 'te.period_number',
  startTime: 'te.start_time',
  endTime: 'te.end_time',
  roomNumber: 'te.room_number',
  type: 'te.type',
  isRecurring: 'te.is_recurring',
  effectiveDate: 'te.effective_date',
  createdAt: 'te.created_at',
  updatedAt: 'te.updated_at',
};

function mapSort(sort) {
  return buildOrderBy(sort, undefined, TIMETABLE_SORT_ALLOWLIST, 'te.day_of_week ASC, te.period_number ASC');
}

function buildEntryWhere(conditions) {
  const keys = Object.keys(conditions);
  const values = [];
  const clauses = [];
  keys.forEach((k, i) => {
    values.push(conditions[k]);
    const col = k.includes('.') ? k : `te.${k}`;
    clauses.push(`${col} = $${i + 1}`);
  });
  const clause = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  return { clause, values };
}

async function fetchClassSections(classId) {
  const rows = await db.raw(
    `
    SELECT cs.*,
           t.first_name AS teacher_first_name,
           t.last_name AS teacher_last_name,
           t.employee_id AS teacher_employee_id
    FROM class_sections cs
    LEFT JOIN teachers t ON t.id = cs.class_teacher_id
    WHERE cs.class_id = $1
    `,
    [classId]
  );
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    classTeacher: s.class_teacher_id
      ? {
          id: s.class_teacher_id,
          firstName: s.teacher_first_name,
          lastName: s.teacher_last_name,
          employeeId: s.teacher_employee_id,
        }
      : null,
    capacity: s.capacity,
    roomNumber: s.room_number,
    status: s.status,
  }));
}

async function attachClassSections(rows) {
  const classIds = [...new Set(rows.map((r) => r.class_id).filter(Boolean))];
  if (!classIds.length) return {};
  const placeholders = classIds.map((_, i) => `$${i + 1}`).join(', ');
  const sections = await db.raw(
    `
    SELECT cs.*,
           t.first_name AS teacher_first_name,
           t.last_name AS teacher_last_name,
           t.employee_id AS teacher_employee_id
    FROM class_sections cs
    LEFT JOIN teachers t ON t.id = cs.class_teacher_id
    WHERE cs.class_id IN (${placeholders})
    `,
    classIds
  );
  const map = {};
  for (const s of sections) {
    if (!map[s.class_id]) map[s.class_id] = [];
    map[s.class_id].push({
      id: s.id,
      name: s.name,
      classTeacher: s.class_teacher_id
        ? {
            id: s.class_teacher_id,
            firstName: s.teacher_first_name,
            lastName: s.teacher_last_name,
            employeeId: s.teacher_employee_id,
          }
        : null,
      capacity: s.capacity,
      roomNumber: s.room_number,
      status: s.status,
    });
  }
  return map;
}

function formatEntry(row, sections = []) {
  return {
    id: row.id,
    academicYear: row.academic_year_id
      ? { id: row.academic_year_id, name: row.academic_year_name }
      : null,
    class: row.class_id
      ? {
          id: row.class_id,
          name: row.class_name,
          academicYear: row.class_academic_year_id,
          sections,
        }
      : null,
    section: row.section_id,
    sectionName: row.section_name || null,
    subject: row.subject_id
      ? { id: row.subject_id, name: row.subject_name, code: row.subject_code, type: row.subject_type }
      : null,
    teacher: row.teacher_id
      ? {
          id: row.teacher_id,
          firstName: row.teacher_first_name,
          lastName: row.teacher_last_name,
          employeeId: row.teacher_employee_id,
        }
      : null,
    dayOfWeek: row.day_of_week,
    periodNumber: row.period_number,
    startTime: row.start_time,
    endTime: row.end_time,
    roomNumber: row.room_number,
    type: row.type,
    isRecurring: row.is_recurring,
    effectiveDate: row.effective_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBodyToRow(body) {
  const data = {};
  Object.keys(fieldMap).forEach((camel) => {
    const snake = fieldMap[camel];
    if (body[camel] !== undefined) data[snake] = body[camel];
  });
  return data;
}

async function fetchEntries(conditions, sort, limit, offset) {
  const { clause, values } = buildEntryWhere(conditions);
  const orderBy = mapSort(sort);
  let query = `${baseEntrySelect} ${clause} ORDER BY ${orderBy}`;
  if (limit) query += ` LIMIT ${limit}`;
  if (offset) query += ` OFFSET ${offset}`;
  const rows = await db.raw(query, values);
  const sectionsMap = await attachClassSections(rows);
  return rows.map((r) => formatEntry(r, sectionsMap[r.class_id] || []));
}

// ---------- CRUD ----------

exports.getTimetableEntries = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const {
    class: classId,
    section,
    teacher,
    academicYear,
    dayOfWeek,
    sort = 'dayOfWeek periodNumber',
  } = req.query;

  const filter = { ...getSchoolFilter(req) };
  if (classId) filter.class_id = classId;
  if (section) filter.section_id = section;
  if (teacher) filter.teacher_id = teacher;
  if (academicYear) filter.academic_year_id = academicYear;
  if (dayOfWeek !== undefined) filter.day_of_week = dayOfWeek;

  const [entries, total] = await Promise.all([
    fetchEntries(filter, sort, limit, skip),
    db.count('timetable_entries', filter),
  ]);

  return ApiResponse.paginated(
    res,
    entries,
    getPaginationMeta(page, limit, total),
    'Timetable entries retrieved successfully'
  );
});

exports.getTimetableEntry = catchAsync(async (req, res) => {
  const { clause, params } = scopeBySchool(req, 1);
  const rows = await db.raw(
    `${baseEntrySelect} WHERE te.id = $1 AND ${clause} LIMIT 1`,
    [req.params.id, ...params]
  );
  const entryRow = rows[0];
  if (!entryRow) {
    throw new ApiError('Timetable entry not found', 404);
  }
  const sections = await fetchClassSections(entryRow.class_id);

  return ApiResponse.success(
    res,
    { entry: formatEntry(entryRow, sections) },
    'Timetable entry retrieved successfully'
  );
});

exports.createTimetableEntry = catchAsync(async (req, res) => {
  const data = mapBodyToRow(req.body);
  data.school_id = req.user.school_id;

  if (minutes(req.body.startTime) >= minutes(req.body.endTime)) {
    throw new ApiError('Start time must be before end time', 400);
  }

  const classDoc = await db.findOne('classes', { id: data.class_id, ...getSchoolFilter(req) });
  if (!classDoc) {
    throw new ApiError('Class not found', 404);
  }
  const section = await db.findOne('class_sections', {
    id: data.section_id,
    class_id: data.class_id,
    ...getSchoolFilter(req),
  });
  if (!section) {
    throw new ApiError('Section not found in this class', 404);
  }

  const existingSlot = await db.findOne('timetable_entries', {
    class_id: data.class_id,
    section_id: data.section_id,
    day_of_week: data.day_of_week,
    period_number: data.period_number,
    academic_year_id: data.academic_year_id,
    ...getSchoolFilter(req),
  });
  if (existingSlot) {
    throw new ApiError('Timetable slot already occupied for this class-section', 409);
  }

  const { clause: tcClause, params: tcParams } = scopeBySchool(req, 5);
  const teacherConflict = await db.raw(
    `
    SELECT * FROM timetable_entries
    WHERE teacher_id = $1
      AND day_of_week = $2
      AND academic_year_id = $3
      AND start_time < $4
      AND end_time > $5
      AND ${tcClause}
    LIMIT 1
    `,
    [data.teacher_id, data.day_of_week, data.academic_year_id, data.end_time, data.start_time, ...tcParams]
  );
  if (teacherConflict.length) {
    throw new ApiError('Teacher already has a conflicting timetable slot', 409);
  }

  const created = await db.insert('timetable_entries', data);
  const { clause: popClause, params: popParams } = scopeBySchool(req, 1);
  const [populated] = await db.raw(
    `${baseEntrySelect} WHERE te.id = $1 AND ${popClause} LIMIT 1`,
    [created.id, ...popParams]
  );
  const sections = await fetchClassSections(populated.class_id);

  return ApiResponse.success(
    res,
    { entry: formatEntry(populated, sections) },
    'Timetable entry created successfully',
    201
  );
});

exports.updateTimetableEntry = catchAsync(async (req, res) => {
  const entry = await db.findOne('timetable_entries', {
    id: req.params.id,
    ...getSchoolFilter(req),
  });
  if (!entry) {
    throw new ApiError('Timetable entry not found', 404);
  }

  const data = mapBodyToRow(req.body);
  const startTime = req.body.startTime || entry.start_time;
  const endTime = req.body.endTime || entry.end_time;

  if (minutes(startTime) >= minutes(endTime)) {
    throw new ApiError('Start time must be before end time', 400);
  }

  const cls = req.body.class || entry.class_id;
  const sec = req.body.section || entry.section_id;
  const day = req.body.dayOfWeek !== undefined ? req.body.dayOfWeek : entry.day_of_week;
  const period =
    req.body.periodNumber !== undefined ? req.body.periodNumber : entry.period_number;
  const ay = req.body.academicYear || entry.academic_year_id;
  const teacher = req.body.teacher || entry.teacher_id;

  const classDoc = await db.findOne('classes', { id: cls, ...getSchoolFilter(req) });
  if (!classDoc) {
    throw new ApiError('Class not found', 404);
  }
  const section = await db.findOne('class_sections', {
    id: sec,
    class_id: cls,
    ...getSchoolFilter(req),
  });
  if (!section) {
    throw new ApiError('Section not found in this class', 404);
  }

  const { clause: scClause, params: scParams } = scopeBySchool(req, 6);
  const slotConflict = await db.raw(
    `
    SELECT * FROM timetable_entries
    WHERE id != $1
      AND class_id = $2
      AND section_id = $3
      AND day_of_week = $4
      AND period_number = $5
      AND academic_year_id = $6
      AND ${scClause}
    LIMIT 1
    `,
    [entry.id, cls, sec, day, period, ay, ...scParams]
  );
  if (slotConflict.length) {
    throw new ApiError('Timetable slot already occupied for this class-section', 409);
  }

  const { clause: tcClause, params: tcParams } = scopeBySchool(req, 6);
  const teacherConflict = await db.raw(
    `
    SELECT * FROM timetable_entries
    WHERE id != $1
      AND teacher_id = $2
      AND day_of_week = $3
      AND academic_year_id = $4
      AND start_time < $5
      AND end_time > $6
      AND ${tcClause}
    LIMIT 1
    `,
    [entry.id, teacher, day, ay, endTime, startTime, ...tcParams]
  );
  if (teacherConflict.length) {
    throw new ApiError('Teacher already has a conflicting timetable slot', 409);
  }

  let updatedId = entry.id;
  if (Object.keys(data).length > 0) {
    const [updated] = await db.update('timetable_entries', data, { id: req.params.id });
    updatedId = updated.id;
  }
  const { clause: popClause, params: popParams } = scopeBySchool(req, 1);
  const [populated] = await db.raw(
    `${baseEntrySelect} WHERE te.id = $1 AND ${popClause} LIMIT 1`,
    [updatedId, ...popParams]
  );
  const sections = await fetchClassSections(populated.class_id);

  return ApiResponse.success(
    res,
    { entry: formatEntry(populated, sections) },
    'Timetable entry updated successfully'
  );
});

exports.deleteTimetableEntry = catchAsync(async (req, res) => {
  const entry = await db.findOne('timetable_entries', {
    id: req.params.id,
    ...getSchoolFilter(req),
  });
  if (!entry) {
    throw new ApiError('Timetable entry not found', 404);
  }

  await db.delete('timetable_entries', { id: req.params.id });
  return ApiResponse.success(res, null, 'Timetable entry deleted successfully');
});

// ---------- Views ----------

exports.getClassTimetable = catchAsync(async (req, res) => {
  const classDoc = await db.findOne('classes', { id: req.params.classId, ...getSchoolFilter(req) });
  if (!classDoc) {
    throw new ApiError('Class not found', 404);
  }

  const { section, academicYear } = req.query;
  const filter = { ...getSchoolFilter(req), class_id: classDoc.id };
  if (section) filter.section_id = section;
  filter.academic_year_id = academicYear || classDoc.academic_year_id;

  const entries = await fetchEntries(filter, 'dayOfWeek periodNumber', null, null);

  return ApiResponse.success(
    res,
    { timetable: entries },
    'Class timetable retrieved successfully'
  );
});

exports.getTeacherTimetable = catchAsync(async (req, res) => {
  const { academicYear, sort = 'dayOfWeek periodNumber' } = req.query;
  const filter = { ...getSchoolFilter(req), teacher_id: req.params.teacherId };
  if (academicYear) filter.academic_year_id = academicYear;

  const entries = await fetchEntries(filter, sort, null, null);

  return ApiResponse.success(
    res,
    { timetable: entries },
    'Teacher timetable retrieved successfully'
  );
});

exports.getConflicts = catchAsync(async (req, res) => {
  const { academicYear } = req.query;
  const conditions = [];
  const values = [];
  if (academicYear) {
    conditions.push('academic_year_id = $1');
    values.push(academicYear);
  }
  const { clause, params } = scopeBySchool(req, values.length);
  if (clause !== '1=1') {
    conditions.push(clause);
    values.push(...params);
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const [teacherRows, classRows] = await Promise.all([
    db.raw(
      `
      SELECT teacher_id, day_of_week, period_number, COUNT(*) AS count, array_agg(id) AS entries
      FROM timetable_entries
      ${where}
      GROUP BY teacher_id, day_of_week, period_number
      HAVING COUNT(*) > 1
      `,
      values
    ),
    db.raw(
      `
      SELECT class_id, section_id, day_of_week, period_number, COUNT(*) AS count, array_agg(id) AS entries
      FROM timetable_entries
      ${where}
      GROUP BY class_id, section_id, day_of_week, period_number
      HAVING COUNT(*) > 1
      `,
      values
    ),
  ]);

  const teacherConflicts = teacherRows.map((r) => ({
    _id: {
      teacher: r.teacher_id,
      dayOfWeek: r.day_of_week,
      periodNumber: r.period_number,
    },
    count: parseInt(r.count, 10),
    entries: r.entries,
  }));

  const classConflicts = classRows.map((r) => ({
    _id: {
      class: r.class_id,
      section: r.section_id,
      dayOfWeek: r.day_of_week,
      periodNumber: r.period_number,
    },
    count: parseInt(r.count, 10),
    entries: r.entries,
  }));

  return ApiResponse.success(
    res,
    { teacherConflicts, classConflicts },
    'Timetable conflicts retrieved successfully'
  );
});

// ---------- Generation stub ----------

exports.generateTimetable = catchAsync(async (req, res) => {
  return ApiResponse.success(
    res,
    null,
    'Timetable generation is not yet implemented. Use individual CRUD endpoints.',
    501
  );
});
