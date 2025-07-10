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

const WORKING_DAYS = [1, 2, 3, 4, 5];
const DEFAULT_PERIOD_COUNT = 8;
const PERIOD_DURATION_MINUTES = 45;

const parseTime = (time) => {
  const [h, m] = String(time).split(':');
  return (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
};

const formatMinutes = (totalMinutes) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const defaultPeriodSchedule = (count = DEFAULT_PERIOD_COUNT) => {
  return Array.from({ length: count }, (_, i) => {
    const start = 8 * 60 + i * PERIOD_DURATION_MINUTES;
    return {
      periodNumber: i + 1,
      startTime: formatMinutes(start),
      endTime: formatMinutes(start + PERIOD_DURATION_MINUTES),
    };
  });
};

const classSlotKey = (classId, sectionId, day, period) =>
  `${classId}|${sectionId}|${day}|${period}`;
const teacherDayKey = (teacherId, day) => `${teacherId}|${day}`;
const classDayKey = (classId, sectionId, day) => `${classId}|${sectionId}|${day}`;

const overlapsAny = (intervals, start, end) => {
  for (const interval of intervals || []) {
    if (start < interval.end && end > interval.start) return true;
  }
  return false;
};

// ---------- Generation ----------

exports.generateTimetable = catchAsync(async (req, res) => {
  const { academicYear, classId, sectionId } = req.body;
  const schoolFilter = getSchoolFilter(req);
  const schoolId = schoolFilter.school_id || req.user.school_id;

  const academicYearDoc = await db.findOne('academic_years', {
    id: academicYear,
    ...schoolFilter,
  });
  if (!academicYearDoc) {
    throw new ApiError('Academic year not found', 404);
  }

  if (classId) {
    const cls = await db.findOne('classes', { id: classId, ...schoolFilter });
    if (!cls) {
      throw new ApiError('Class not found', 404);
    }
  }
  if (sectionId) {
    const sectionWhere = { id: sectionId, ...schoolFilter };
    if (classId) sectionWhere.class_id = classId;
    const sec = await db.findOne('class_sections', sectionWhere);
    if (!sec) {
      throw new ApiError('Section not found', 404);
    }
  }

  const result = await db.transaction(async (tdb) => {
    const targetParams = [schoolId, academicYear];
    let targetWhere = 'WHERE cs.school_id = $1 AND c.academic_year_id = $2';
    if (classId) {
      targetWhere += ` AND cs.class_id = $${targetParams.length + 1}`;
      targetParams.push(classId);
    }
    if (sectionId) {
      targetWhere += ` AND cs.id = $${targetParams.length + 1}`;
      targetParams.push(sectionId);
    }

    const targets = await tdb.raw(
      `
      SELECT cs.id AS section_id, cs.class_id, cs.name AS section_name, cs.room_number,
             c.name AS class_name, c.numeric_name
      FROM class_sections cs
      JOIN classes c ON c.id = cs.class_id
      ${targetWhere}
      ORDER BY c.numeric_name, cs.name
      `,
      targetParams
    );

    if (!targets.length) {
      return { created: 0, unallocated: [], skipped: [] };
    }

    const sectionIds = targets.map((t) => t.section_id);
    const placeholders = sectionIds.map((_, i) => `$${i + 2}`).join(', ');
    const allocations = await tdb.raw(
      `
      SELECT cs.id, cs.class_id, cs.section_id, cs.subject_id,
             cs.weekly_periods, cs.teacher_id, s.name AS subject_name
      FROM class_subjects cs
      JOIN subjects s ON s.id = cs.subject_id
      WHERE cs.academic_year_id = $1 AND cs.section_id IN (${placeholders})
      ORDER BY cs.class_id, cs.section_id, s.name
      `,
      [academicYear, ...sectionIds]
    );

    if (!allocations.length) {
      return { created: 0, unallocated: [], skipped: [] };
    }

    const subjectIds = [...new Set(allocations.map((a) => a.subject_id))];
    const candidatesBySubject = {};
    if (subjectIds.length) {
      const candPlaceholders = subjectIds.map((_, i) => `$${i + 2}`).join(', ');
      const candidates = await tdb.raw(
        `
        SELECT teacher_id, subject_id
        FROM teacher_subjects
        WHERE school_id = $1 AND subject_id IN (${candPlaceholders})
        `,
        [schoolId, ...subjectIds]
      );
      for (const c of candidates) {
        if (!candidatesBySubject[c.subject_id]) {
          candidatesBySubject[c.subject_id] = [];
        }
        candidatesBySubject[c.subject_id].push(c.teacher_id);
      }
    }

    const existing = await tdb.raw(
      `
      SELECT teacher_id, class_id, section_id, day_of_week, period_number,
             start_time, end_time
      FROM timetable_entries
      WHERE academic_year_id = $1 AND school_id = $2
      `,
      [academicYear, schoolId]
    );

    const periodRows = await tdb.raw(
      `
      SELECT DISTINCT period_number, start_time, end_time
      FROM timetable_entries
      WHERE academic_year_id = $1 AND school_id = $2
      ORDER BY period_number
      `,
      [academicYear, schoolId]
    );

    let schedule = [];
    if (periodRows.length) {
      const byPeriod = {};
      for (const r of periodRows) {
        byPeriod[r.period_number] = r;
      }
      const maxExistingPeriod = Math.max(...periodRows.map((r) => r.period_number));
      let lastEnd = 8 * 60;
      const periodCount = Math.max(maxExistingPeriod, DEFAULT_PERIOD_COUNT);
      for (let p = 1; p <= periodCount; p += 1) {
        if (byPeriod[p]) {
          schedule.push({
            periodNumber: p,
            startTime: byPeriod[p].start_time,
            endTime: byPeriod[p].end_time,
          });
          lastEnd = parseTime(byPeriod[p].end_time);
        } else {
          const start = lastEnd;
          schedule.push({
            periodNumber: p,
            startTime: formatMinutes(start),
            endTime: formatMinutes(start + PERIOD_DURATION_MINUTES),
          });
          lastEnd = start + PERIOD_DURATION_MINUTES;
        }
      }
    } else {
      schedule = defaultPeriodSchedule(DEFAULT_PERIOD_COUNT);
    }

    const occupiedClassPeriods = new Set();
    const classBookings = new Map();
    const teacherBookings = new Map();
    const teacherLoad = new Map();
    for (const e of existing) {
      occupiedClassPeriods.add(
        classSlotKey(e.class_id, e.section_id, e.day_of_week, e.period_number)
      );

      const start = parseTime(e.start_time);
      const end = parseTime(e.end_time);
      const cDayKey = classDayKey(e.class_id, e.section_id, e.day_of_week);
      if (!classBookings.has(cDayKey)) classBookings.set(cDayKey, []);
      classBookings.get(cDayKey).push({ start, end });

      if (e.teacher_id) {
        const tDayKey = teacherDayKey(e.teacher_id, e.day_of_week);
        if (!teacherBookings.has(tDayKey)) teacherBookings.set(tDayKey, []);
        teacherBookings.get(tDayKey).push({ start, end });
        teacherLoad.set(e.teacher_id, (teacherLoad.get(e.teacher_id) || 0) + 1);
      }
    }

    const allocationsBySection = {};
    for (const a of allocations) {
      const key = `${a.class_id}|${a.section_id}`;
      if (!allocationsBySection[key]) {
        allocationsBySection[key] = [];
      }
      allocationsBySection[key].push(a);
    }

    const unallocated = [];
    const skipped = [];
    let created = 0;

    for (const section of targets) {
      const sectionAllocations = allocationsBySection[`${section.class_id}|${section.section_id}`];
      if (!sectionAllocations) continue;

      const sessions = [];
      for (const a of sectionAllocations) {
        const candidates = a.teacher_id
          ? null
          : candidatesBySubject[a.subject_id] || [];
        for (let i = 0; i < a.weekly_periods; i += 1) {
          sessions.push({
            classId: a.class_id,
            sectionId: a.section_id,
            subjectId: a.subject_id,
            subjectName: a.subject_name,
            teacherId: a.teacher_id,
            candidates,
          });
        }
      }

      while (schedule.length * WORKING_DAYS.length < sessions.length) {
        const last = schedule[schedule.length - 1];
        const start = parseTime(last.endTime);
        schedule.push({
          periodNumber: schedule.length + 1,
          startTime: formatMinutes(start),
          endTime: formatMinutes(start + PERIOD_DURATION_MINUTES),
        });
      }

      for (const session of sessions) {
        const teacherCandidates = session.teacherId
          ? [session.teacherId]
          : session.candidates;

        if (!teacherCandidates || !teacherCandidates.length) {
          skipped.push({
            classId: session.classId,
            className: section.class_name,
            sectionId: session.sectionId,
            sectionName: section.section_name,
            subjectId: session.subjectId,
            subjectName: session.subjectName,
            reason: 'No teacher assigned or qualified',
          });
          continue;
        }

        let assigned = false;
        for (const day of WORKING_DAYS) {
          for (const period of schedule) {
            const cKey = classSlotKey(
              session.classId,
              session.sectionId,
              day,
              period.periodNumber
            );
            if (occupiedClassPeriods.has(cKey)) continue;

            const slotStart = parseTime(period.startTime);
            const slotEnd = parseTime(period.endTime);
            const cDayKey = classDayKey(session.classId, session.sectionId, day);
            if (overlapsAny(classBookings.get(cDayKey), slotStart, slotEnd)) continue;

            let bestTeacher = null;
            let bestLoad = Infinity;
            for (const tid of teacherCandidates) {
              const tDayKey = teacherDayKey(tid, day);
              if (overlapsAny(teacherBookings.get(tDayKey), slotStart, slotEnd)) continue;
              const load = teacherLoad.get(tid) || 0;
              if (load < bestLoad) {
                bestLoad = load;
                bestTeacher = tid;
              }
            }

            if (!bestTeacher) continue;

            await tdb.insert('timetable_entries', {
              school_id: schoolId,
              academic_year_id: academicYear,
              class_id: session.classId,
              section_id: session.sectionId,
              subject_id: session.subjectId,
              teacher_id: bestTeacher,
              day_of_week: day,
              period_number: period.periodNumber,
              start_time: period.startTime,
              end_time: period.endTime,
              room_number: section.room_number || '',
              type: 'regular',
              is_recurring: true,
            });

            occupiedClassPeriods.add(cKey);
            if (!classBookings.has(cDayKey)) classBookings.set(cDayKey, []);
            classBookings.get(cDayKey).push({ start: slotStart, end: slotEnd });
            const tDayKey = teacherDayKey(bestTeacher, day);
            if (!teacherBookings.has(tDayKey)) teacherBookings.set(tDayKey, []);
            teacherBookings.get(tDayKey).push({ start: slotStart, end: slotEnd });
            teacherLoad.set(bestTeacher, bestLoad + 1);
            created += 1;
            assigned = true;
            break;
          }
          if (assigned) break;
        }

        if (!assigned) {
          unallocated.push({
            classId: session.classId,
            className: section.class_name,
            sectionId: session.sectionId,
            sectionName: section.section_name,
            subjectId: session.subjectId,
            subjectName: session.subjectName,
          });
        }
      }
    }

    return { created, unallocated, skipped };
  });

  return ApiResponse.success(
    res,
    {
      created: result.created,
      unallocated: result.unallocated,
      skipped: result.skipped,
    },
    'Timetable generated successfully'
  );
});
