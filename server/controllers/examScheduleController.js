const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { getSchoolFilter, scopeBySchool } = require('../middleware/auth');
const { buildOrderBy } = require('../utils/sort');

const SCHEDULE_COLUMN_MAP = {
  exam: 'exam_id',
  class: 'class_id',
  section: 'section_id',
  subject: 'subject_id',
  examDate: 'exam_date',
  startTime: 'start_time',
  endTime: 'end_time',
  maxMarks: 'max_marks',
  passMarks: 'pass_marks',
  roomNumber: 'room_number',
  invigilator: 'invigilator_id',
  academicYear: 'academic_year_id',
};

const SORT_FIELDS = {
  examDate: 'es.exam_date',
  startTime: 'es.start_time',
  endTime: 'es.end_time',
  createdAt: 'es.created_at',
  updatedAt: 'es.updated_at',
  class: 'es.class_id',
  section: 'es.section_id',
  subject: 'es.subject_id',
};

function mapScheduleData(data) {
  const result = {};
  for (const [key, column] of Object.entries(SCHEDULE_COLUMN_MAP)) {
    if (data[key] !== undefined) result[column] = data[key];
  }
  return result;
}

function mapSort(sort) {
  return buildOrderBy(sort, undefined, SORT_FIELDS, 'es.exam_date ASC, es.start_time ASC');
}

function buildDateRange(dateInput) {
  const date = new Date(dateInput);
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return { date, next };
}

function buildScheduleFilters(examId, query, req) {
  const conditions = ['es.exam_id = $1'];
  const values = [examId];

  if (query.class) {
    values.push(query.class);
    conditions.push(`es.class_id = $${values.length}`);
  }
  if (query.section) {
    values.push(query.section);
    conditions.push(`es.section_id = $${values.length}`);
  }
  if (query.subject) {
    values.push(query.subject);
    conditions.push(`es.subject_id = $${values.length}`);
  }
  if (query.examDate) {
    const { date, next } = buildDateRange(query.examDate);
    values.push(date);
    conditions.push(`es.exam_date >= $${values.length}::timestamp`);
    values.push(next);
    conditions.push(`es.exam_date < $${values.length}::timestamp`);
  }

  const { clause, params } = scopeBySchool(req, values.length);
  if (clause !== '1=1') {
    conditions.push(`es.${clause}`);
    values.push(...params);
  }

  return { where: conditions.join(' AND '), values };
}

function formatSchedule(row, includeExam = false) {
  if (!row) return null;

  const {
    class_name: className,
    subject_name: subjectName,
    subject_code: subjectCode,
    first_name: firstName,
    last_name: lastName,
    exam_name: examName,
    exam_type: examType,
    ...schedule
  } = row;

  schedule.class = schedule.class_id
    ? { id: schedule.class_id, name: className }
    : null;
  schedule.subject = schedule.subject_id
    ? { id: schedule.subject_id, name: subjectName, code: subjectCode }
    : null;
  schedule.invigilator = schedule.invigilator_id
    ? { id: schedule.invigilator_id, firstName, lastName }
    : null;

  if (includeExam) {
    schedule.exam = {
      id: schedule.exam_id,
      name: examName,
      examType,
    };
  }

  return schedule;
}

async function fetchPopulatedSchedule(scheduleId, includeExam = false, req) {
  const examJoin = includeExam
    ? 'JOIN exams e ON e.id = es.exam_id'
    : '';
  const examSelect = includeExam
    ? ', e.name AS exam_name, e.exam_type AS exam_type'
    : '';

  const { clause, params } = scopeBySchool(req, 1);
  const schoolCondition = clause === '1=1' ? clause : `es.${clause}`;

  const rows = await db.raw(
    `SELECT es.*,
            c.name AS class_name,
            s.name AS subject_name,
            s.code AS subject_code,
            t.first_name,
            t.last_name
            ${examSelect}
     FROM exam_schedules es
     LEFT JOIN classes c ON c.id = es.class_id
     LEFT JOIN subjects s ON s.id = es.subject_id
     LEFT JOIN teachers t ON t.id = es.invigilator_id
     ${examJoin}
     WHERE es.id = $1 AND ${schoolCondition}
     LIMIT 1`,
    [scheduleId, ...params]
  );

  return formatSchedule(rows[0], includeExam);
}

const checkScheduleClash = async (req, examId, data, excludeId = null) => {
  const { date, next } = buildDateRange(data.examDate);
  const params = [examId, data.class, data.section, date, next];
  let excludeClause = '';

  if (excludeId) {
    params.push(excludeId);
    excludeClause = `AND es.id != $${params.length}`;
  }

  const { clause, params: schoolParams } = scopeBySchool(req, params.length);
  const schoolCondition = clause === '1=1' ? '' : `AND es.${clause}`;
  if (schoolCondition) params.push(...schoolParams);

  const rows = await db.raw(
    `SELECT * FROM exam_schedules es
     WHERE es.exam_id = $1
       AND es.class_id = $2
       AND es.section_id = $3
       AND es.exam_date >= $4::timestamp
       AND es.exam_date < $5::timestamp
       ${excludeClause}
       ${schoolCondition}
     LIMIT 1`,
    params
  );

  return rows[0] || null;
};

// @desc    List exam schedules for an exam
// @route   GET /api/v1/exams/:examId/schedules
// @access  Admin, Principal, Teacher
exports.getSchedules = catchAsync(async (req, res) => {
  const { examId } = req.params;
  const { sort = 'examDate startTime' } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const { where, values } = buildScheduleFilters(examId, req.query, req);
  const orderBy = mapSort(sort);

  const [countRows, scheduleRows] = await Promise.all([
    db.raw(
      `SELECT COUNT(*) AS count FROM exam_schedules es WHERE ${where}`,
      values
    ),
    db.raw(
      `SELECT es.*,
              c.name AS class_name,
              s.name AS subject_name,
              s.code AS subject_code,
              t.first_name,
              t.last_name
       FROM exam_schedules es
       LEFT JOIN classes c ON c.id = es.class_id
       LEFT JOIN subjects s ON s.id = es.subject_id
       LEFT JOIN teachers t ON t.id = es.invigilator_id
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, skip]
    ),
  ]);

  const total = parseInt(countRows[0].count, 10);
  const schedules = scheduleRows.map((row) => formatSchedule(row));
  const meta = getPaginationMeta(page, limit, total);

  return ApiResponse.paginated(
    res,
    schedules,
    meta,
    'Exam schedules retrieved successfully'
  );
});

// @desc    Get a single exam schedule
// @route   GET /api/v1/exams/:examId/schedules/:scheduleId
// @access  Admin, Principal, Teacher
exports.getSchedule = catchAsync(async (req, res) => {
  const { examId, scheduleId } = req.params;

  const schedule = await fetchPopulatedSchedule(scheduleId, true, req);

  if (!schedule || schedule.exam_id !== examId) {
    throw new ApiError('Exam schedule not found', 404);
  }

  return ApiResponse.success(
    res,
    { schedule },
    'Exam schedule retrieved successfully'
  );
});

// @desc    Create an exam schedule
// @route   POST /api/v1/exams/:examId/schedules
// @access  Admin, Principal
exports.createSchedule = catchAsync(async (req, res) => {
  const { examId } = req.params;
  const data = req.body;

  const exam = await db.findOne('exams', { id: examId, ...getSchoolFilter(req) });
  if (!exam) {
    throw new ApiError('Exam not found', 404);
  }

  if (data.startTime >= data.endTime) {
    throw new ApiError('Start time must be before end time', 400);
  }

  if (data.passMarks > data.maxMarks) {
    throw new ApiError('Passing marks cannot exceed maximum marks', 400);
  }

  const clash = await checkScheduleClash(req, examId, data);
  if (clash) {
    throw new ApiError(
      'Another schedule already exists for this class, section and date',
      409
    );
  }

  const insertData = {
    ...mapScheduleData(data),
    exam_id: examId,
    academic_year_id: data.academicYear || exam.academic_year_id,
    school_id: req.user.school_id,
  };

  const schedule = await db.insert('exam_schedules', insertData);
  const populatedSchedule = await fetchPopulatedSchedule(schedule.id, false, req);

  return ApiResponse.success(
    res,
    { schedule: populatedSchedule },
    'Exam schedule created successfully',
    201
  );
});

// @desc    Update an exam schedule
// @route   PUT /api/v1/exams/:examId/schedules/:scheduleId
// @access  Admin, Principal
exports.updateSchedule = catchAsync(async (req, res) => {
  const { examId, scheduleId } = req.params;
  const data = req.body;

  const schedule = await db.findOne('exam_schedules', {
    id: scheduleId,
    ...getSchoolFilter(req),
  });
  if (!schedule || schedule.exam_id !== examId) {
    throw new ApiError('Exam schedule not found', 404);
  }

  const exam = await db.findOne('exams', { id: examId, ...getSchoolFilter(req) });
  if (exam.is_result_published) {
    throw new ApiError(
      'Cannot update schedule after results are published',
      400
    );
  }

  const publishedMark = await db.findOne('marks', {
    exam_schedule_id: scheduleId,
    status: 'published',
    ...getSchoolFilter(req),
  });
  if (publishedMark) {
    throw new ApiError(
      'Cannot update schedule with published marks',
      400
    );
  }

  const maxMarks = data.maxMarks ?? schedule.max_marks;
  const passMarks = data.passMarks ?? schedule.pass_marks;
  const startTime = data.startTime ?? schedule.start_time;
  const endTime = data.endTime ?? schedule.end_time;

  if (startTime >= endTime) {
    throw new ApiError('Start time must be before end time', 400);
  }

  if (passMarks > maxMarks) {
    throw new ApiError('Passing marks cannot exceed maximum marks', 400);
  }

  const checkData = {
    class: data.class ?? schedule.class_id,
    section: data.section ?? schedule.section_id,
    examDate: data.examDate ?? schedule.exam_date,
  };

  const clash = await checkScheduleClash(req, examId, checkData, scheduleId);
  if (clash) {
    throw new ApiError(
      'Another schedule already exists for this class, section and date',
      409
    );
  }

  const updateData = mapScheduleData(data);
  if (Object.keys(updateData).length > 0) {
    await db.update('exam_schedules', updateData, {
      id: scheduleId,
      ...getSchoolFilter(req),
    });
  }

  const updatedSchedule = await fetchPopulatedSchedule(scheduleId, false, req);

  return ApiResponse.success(
    res,
    { schedule: updatedSchedule },
    'Exam schedule updated successfully'
  );
});

// @desc    Delete an exam schedule
// @route   DELETE /api/v1/exams/:examId/schedules/:scheduleId
// @access  Admin, Principal
exports.deleteSchedule = catchAsync(async (req, res) => {
  const { examId, scheduleId } = req.params;

  const schedule = await db.findOne('exam_schedules', {
    id: scheduleId,
    ...getSchoolFilter(req),
  });
  if (!schedule || schedule.exam_id !== examId) {
    throw new ApiError('Exam schedule not found', 404);
  }

  const marksCount = await db.count('marks', {
    exam_schedule_id: scheduleId,
    ...getSchoolFilter(req),
  });
  if (marksCount > 0) {
    throw new ApiError(
      `Cannot delete schedule. ${marksCount} mark record(s) exist.`,
      400
    );
  }

  await db.delete('exam_schedules', { id: scheduleId, ...getSchoolFilter(req) });
  return ApiResponse.success(res, null, 'Exam schedule deleted successfully');
});
