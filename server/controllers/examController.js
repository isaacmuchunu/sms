const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const notificationService = require('../services/notificationService');
const { getSchoolFilter, scopeBySchool } = require('../middleware/auth');
const { buildOrderBy } = require('../utils/sort');

const EXAM_SORT_ALLOWLIST = {
  createdAt: 'e.created_at',
  updatedAt: 'e.updated_at',
  name: 'e.name',
  examType: 'e.exam_type',
  status: 'e.status',
  startDate: 'e.start_date',
  endDate: 'e.end_date',
  weightage: 'e.weightage',
  resultPublishDate: 'e.result_publish_date',
  isResultPublished: 'e.is_result_published',
};

function mapAcademicYear(row) {
  if (row.academic_year_name != null) {
    return { id: row.academic_year_id, name: row.academic_year_name };
  }
  if (row.academic_year_id != null) {
    return row.academic_year_id;
  }
  return undefined;
}

function mapExam(row) {
  return {
    id: row.id,
    name: row.name,
    examType: row.exam_type,
    academicYear: mapAcademicYear(row),
    startDate: row.start_date,
    endDate: row.end_date,
    weightage: row.weightage,
    resultPublishDate: row.result_publish_date,
    isResultPublished: row.is_result_published,
    status: row.status,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSchedule(row) {
  return {
    id: row.id,
    exam: row.exam_id,
    class: row.class_id
      ? { id: row.class_id, name: row.class_name }
      : null,
    section: row.section_id,
    subject: row.subject_id
      ? { id: row.subject_id, name: row.subject_name, code: row.subject_code }
      : null,
    examDate: row.exam_date,
    startTime: row.start_time,
    endTime: row.end_time,
    maxMarks: row.max_marks,
    passMarks: row.pass_marks,
    roomNumber: row.room_number,
    invigilator: row.invigilator_id
      ? {
          id: row.invigilator_id,
          firstName: row.first_name,
          lastName: row.last_name,
        }
      : null,
    academicYear: row.academic_year_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchExamWithAcademicYear(id, req) {
  const { clause, params } = scopeBySchool(req, 1);
  const rows = await db.raw(
    `SELECT e.*, ay.id AS academic_year_id, ay.name AS academic_year_name
     FROM exams e
     LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
     WHERE e.id = $1 AND ${clause}`,
    [id, ...params]
  );
  return rows[0] || null;
}

// @desc    List exams with filters, search, sort and pagination
// @route   GET /api/v1/exams
// @access  Admin, Principal, Teacher
exports.getExams = catchAsync(async (req, res) => {
  const { type, status, academicYear, search, sort = '-createdAt' } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const conditions = [];
  const params = [];

  if (type) {
    conditions.push(`e.exam_type = $${params.length + 1}`);
    params.push(type);
  }
  if (status) {
    conditions.push(`e.status = $${params.length + 1}`);
    params.push(status);
  }
  if (academicYear) {
    conditions.push(`e.academic_year_id = $${params.length + 1}`);
    params.push(academicYear);
  }
  if (search) {
    conditions.push(`e.name ILIKE $${params.length + 1}`);
    params.push(`%${search}%`);
  }

  const { clause, params: schoolParams } = scopeBySchool(req, params.length);
  if (clause !== '1=1') {
    conditions.push(clause);
    params.push(...schoolParams);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = buildOrderBy(sort, undefined, EXAM_SORT_ALLOWLIST, 'e.created_at DESC');

  const countParams = [...params];
  const countQuery = `SELECT COUNT(*) AS count FROM exams e ${whereClause}`;

  const listParams = [...params, limit, skip];
  const listQuery = `
    SELECT e.*, ay.id AS academic_year_id, ay.name AS academic_year_name
    FROM exams e
    LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const [countResult, examRows] = await Promise.all([
    db.raw(countQuery, countParams),
    db.raw(listQuery, listParams),
  ]);

  const total = parseInt(countResult[0].count, 10);
  const exams = examRows.map(mapExam);

  const meta = getPaginationMeta(page, limit, total);
  return ApiResponse.paginated(res, exams, meta, 'Exams retrieved successfully');
});

// @desc    Get a single exam with its full schedule
// @route   GET /api/v1/exams/:id
// @access  Admin, Principal, Teacher
exports.getExam = catchAsync(async (req, res) => {
  const exam = await fetchExamWithAcademicYear(req.params.id, req);

  if (!exam) {
    throw new ApiError('Exam not found', 404);
  }

  const { clause: schClause, params: schParams } = scopeBySchool(req, 1);
  const scheduleSchoolCondition = schClause === '1=1' ? schClause : `es.${schClause}`;
  const scheduleRows = await db.raw(
    `SELECT es.*,
            c.id AS class_id, c.name AS class_name,
            s.id AS subject_id, s.name AS subject_name, s.code AS subject_code,
            t.id AS invigilator_id, t.first_name, t.last_name
     FROM exam_schedules es
     LEFT JOIN classes c ON es.class_id = c.id
     LEFT JOIN subjects s ON es.subject_id = s.id
     LEFT JOIN teachers t ON es.invigilator_id = t.id
     WHERE es.exam_id = $1 AND ${scheduleSchoolCondition}
     ORDER BY es.exam_date ASC, es.start_time ASC`,
    [req.params.id, ...schParams]
  );

  const schedules = scheduleRows.map(mapSchedule);

  return ApiResponse.success(
    res,
    { exam: mapExam(exam), schedules },
    'Exam retrieved successfully'
  );
});

// @desc    Create a new exam
// @route   POST /api/v1/exams
// @access  Admin, Principal
exports.createExam = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.body;

  if (new Date(startDate) > new Date(endDate)) {
    throw new ApiError('Start date cannot be after end date', 400);
  }

  const insertData = {
    name: req.body.name,
    exam_type: req.body.examType,
    academic_year_id: req.body.academicYear,
    start_date: req.body.startDate,
    end_date: req.body.endDate,
    weightage: req.body.weightage,
    description: req.body.description,
    status: 'draft',
    is_result_published: false,
    school_id: req.user.school_id,
  };

  // Remove undefined keys so PostgreSQL can use defaults where appropriate
  Object.keys(insertData).forEach((key) => {
    if (insertData[key] === undefined) delete insertData[key];
  });

  const createdExam = await db.insert('exams', insertData);
  const populatedExam = await fetchExamWithAcademicYear(createdExam.id, req);

  return ApiResponse.success(
    res,
    { exam: mapExam(populatedExam) },
    'Exam created successfully',
    201
  );
});

// @desc    Update an exam
// @route   PUT /api/v1/exams/:id
// @access  Admin, Principal
exports.updateExam = catchAsync(async (req, res) => {
  const exam = await db.findOne('exams', { id: req.params.id, ...getSchoolFilter(req) });
  if (!exam) {
    throw new ApiError('Exam not found', 404);
  }

  if (exam.is_result_published) {
    throw new ApiError('Cannot update an exam whose results are published', 400);
  }

  const { startDate, endDate } = req.body;
  const start = startDate ? new Date(startDate) : exam.start_date;
  const end = endDate ? new Date(endDate) : exam.end_date;

  if (start > end) {
    throw new ApiError('Start date cannot be after end date', 400);
  }

  const updateData = {};
  if (req.body.name !== undefined) updateData.name = req.body.name;
  if (req.body.examType !== undefined) updateData.exam_type = req.body.examType;
  if (req.body.academicYear !== undefined) updateData.academic_year_id = req.body.academicYear;
  if (req.body.startDate !== undefined) updateData.start_date = req.body.startDate;
  if (req.body.endDate !== undefined) updateData.end_date = req.body.endDate;
  if (req.body.weightage !== undefined) updateData.weightage = req.body.weightage;
  if (req.body.description !== undefined) updateData.description = req.body.description;
  if (req.body.status !== undefined) updateData.status = req.body.status;

  if (Object.keys(updateData).length > 0) {
    await db.update('exams', updateData, { id: req.params.id });
  }

  const updatedExam = await fetchExamWithAcademicYear(req.params.id, req);

  return ApiResponse.success(
    res,
    { exam: mapExam(updatedExam) },
    'Exam updated successfully'
  );
});

// @desc    Delete an exam (only when no marks exist)
// @route   DELETE /api/v1/exams/:id
// @access  Admin
exports.deleteExam = catchAsync(async (req, res) => {
  const exam = await db.findOne('exams', { id: req.params.id, ...getSchoolFilter(req) });
  if (!exam) {
    throw new ApiError('Exam not found', 404);
  }

  const marksCount = await db.count('marks', { exam_id: exam.id, ...getSchoolFilter(req) });
  if (marksCount > 0) {
    throw new ApiError(
      `Cannot delete exam. ${marksCount} mark record(s) exist.`,
      400
    );
  }

  await db.delete('exam_schedules', { exam_id: exam.id, ...getSchoolFilter(req) });
  await db.delete('exams', { id: exam.id, ...getSchoolFilter(req) });

  return ApiResponse.success(res, null, 'Exam deleted successfully');
});

// @desc    Publish exam results
// @route   POST /api/v1/exams/:id/publish
// @access  Admin, Principal
exports.publishResults = catchAsync(async (req, res) => {
  const exam = await db.findOne('exams', { id: req.params.id, ...getSchoolFilter(req) });
  if (!exam) {
    throw new ApiError('Exam not found', 404);
  }

  if (exam.is_result_published) {
    throw new ApiError('Exam results are already published', 400);
  }

  const updatedRows = await db.update(
    'exams',
    {
      is_result_published: true,
      result_publish_date: new Date(),
      status: 'completed',
    },
    { id: req.params.id, ...getSchoolFilter(req) }
  );

  const updatedExam = updatedRows[0];

  const publishedMarks = await db.update(
    'marks',
    { status: 'published' },
    { exam_id: exam.id, status: 'verified', ...getSchoolFilter(req) }
  );

  // Fire-and-forget in-app notifications to students/parents for published results
  if (publishedMarks.length > 0) {
    const studentIds = [...new Set(publishedMarks.map((m) => m.student_id))];
    const notifyResults = async () => {
      try {
        const allRecipientIds = [];
        for (const studentId of studentIds) {
          const ids = await notificationService.getStudentAndGuardianUserIds(studentId);
          allRecipientIds.push(...ids);
        }
        const uniqueRecipientIds = [...new Set(allRecipientIds)];
        if (uniqueRecipientIds.length > 0) {
          await notificationService.createBulkNotifications({
            recipientIds: uniqueRecipientIds,
            senderId: req.user?.id || req.user?._id,
            title: 'Exam results published',
            message: `Results for ${exam.name} have been published. Check your dashboard for details.`,
            type: 'exam',
            referenceModel: 'exams',
            referenceId: exam.id,
          });
        }
      } catch (err) {
        console.error('Failed to create exam result notifications:', err.message);
      }
    };
    notifyResults();
  }

  return ApiResponse.success(
    res,
    { exam: mapExam(updatedExam), publishedCount: publishedMarks.length },
    'Results published successfully'
  );
});
