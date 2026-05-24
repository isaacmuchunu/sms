const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { getSchoolFilter, scopeBySchool } = require('../middleware/auth');
const { buildOrderBy } = require('../utils/sort');

async function fetchDefaultGradingScale(schoolId) {
  if (!schoolId) return null;
  const scaleRows = await db.raw(
    'SELECT * FROM grading_scales WHERE is_default = true AND school_id = $1 ORDER BY created_at ASC LIMIT 1',
    [schoolId]
  );
  if (!scaleRows || scaleRows.length === 0) return null;
  const grades = await db.findMany('grading_scale_grades', {
    where: { grading_scale_id: scaleRows[0].id },
    orderBy: 'min_percent DESC',
  });
  return { ...scaleRows[0], grades };
}

const calculateGrade = (percentage, scale) => {
  if (scale && Array.isArray(scale.grades) && scale.grades.length > 0) {
    const match = scale.grades.find((g) => percentage >= Number(g.min_percent));
    return match ? match.grade : 'F';
  }
  // Fallback only when no configured scale exists
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
};

const getMarkStats = (marks) => {
  const obtained = marks.map((m) => m.marksObtained);
  const total = marks.length;
  const highest = total > 0 ? Math.max(...obtained) : 0;
  const lowest = total > 0 ? Math.min(...obtained) : 0;
  const average =
    total > 0
      ? +(obtained.reduce((sum, val) => sum + val, 0) / total).toFixed(2)
      : 0;
  const passCount = marks.filter((m) => m.marksObtained >= m.passMarks).length;
  const failCount = total - passCount;

  return { total, highest, lowest, average, passCount, failCount };
};

const MARK_SORT_ALLOWLIST = {
  createdAt: 'm.created_at',
  marksObtained: 'm.marks_obtained',
  status: 'm.status',
  student: 's.roll_no',
  subject: 'sub.name',
};

const formatMark = (row) => {
  const mark = {
    _id: row.id,
    id: row.id,
    examSchedule: row.exam_schedule_id,
    exam: row.exam_id,
    student: row.student_id,
    class: row.class_id,
    section: row.section_id,
    subject: row.subject_id,
    marksObtained:
      row.marks_obtained !== null && row.marks_obtained !== undefined
        ? Number(row.marks_obtained)
        : null,
    maxMarks: Number(row.max_marks),
    passMarks: Number(row.pass_marks),
    grade: row.grade,
    percentage:
      row.percentage !== null && row.percentage !== undefined
        ? Number(row.percentage)
        : null,
    remarks: row.remarks,
    status: row.status,
    enteredBy: row.entered_by_id,
    verifiedBy: row.verified_by_id,
    academicYear: row.academic_year_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (row.first_name !== undefined) {
    mark.student = {
      _id: row.student_id,
      firstName: row.first_name,
      lastName: row.last_name,
      rollNo: row.roll_no,
      admissionNo: row.admission_no,
    };
  }

  if (row.subject_name !== undefined) {
    mark.subject = {
      _id: row.subject_id,
      name: row.subject_name,
      code: row.subject_code,
    };
  }

  if (row.entered_by_email !== undefined) {
    mark.enteredBy = {
      _id: row.entered_by_id,
      email: row.entered_by_email,
    };
  }

  if (row.exam_date !== undefined) {
    mark.examSchedule = {
      _id: row.exam_schedule_id,
      examDate: row.exam_date,
      maxMarks: Number(row.schedule_max_marks ?? row.max_marks),
      passMarks: Number(row.schedule_pass_marks ?? row.pass_marks),
    };
  }

  return mark;
};

const formatStudent = (row) => ({
  _id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  rollNo: row.roll_no,
  admissionNo: row.admission_no,
  class: row.class_name
    ? { _id: row.class_id, name: row.class_name }
    : row.class_id,
  section: row.section_id,
});

const formatExam = (row) => ({
  _id: row.id,
  name: row.name,
  examType: row.exam_type,
  academicYear: row.academic_year_name
    ? { _id: row.academic_year_id, name: row.academic_year_name }
    : row.academic_year_id,
  isResultPublished: row.is_result_published,
});

const assertScheduleBelongsToExam = async (req, examId, scheduleId) => {
  const schedule = await db.findOne('exam_schedules', {
    id: scheduleId,
    ...getSchoolFilter(req),
  });
  if (!schedule || schedule.exam_id !== examId) {
    throw new ApiError('Exam schedule not found', 404);
  }
  return schedule;
};

// @desc    List marks for an exam schedule
// @route   GET /api/v1/exams/:examId/schedules/:scheduleId/marks
// @access  Admin, Principal, Teacher
exports.getMarksBySchedule = catchAsync(async (req, res) => {
  const { examId, scheduleId } = req.params;
  const { status, search, sort = 'createdAt' } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  await assertScheduleBelongsToExam(req, examId, scheduleId);

  const values = [scheduleId];
  const conditions = ['m.exam_schedule_id = $1'];

  if (status) {
    values.push(status);
    conditions.push(`m.status = $${values.length}`);
  }

  if (search) {
    const pattern = `%${search}%`;
    const { clause: stClause, params: stParams } = scopeBySchool(req, 1);
    const matchingStudents = await db.raw(
      `SELECT id FROM students
       WHERE (first_name ILIKE $1
          OR last_name ILIKE $1
          OR admission_no ILIKE $1
          OR roll_no ILIKE $1)
          AND ${stClause}`,
      [pattern, ...stParams]
    );
    const studentIds = matchingStudents.map((s) => s.id);
    if (studentIds.length === 0) {
      conditions.push('1 = 0');
    } else {
      values.push(studentIds);
      conditions.push(`m.student_id = ANY($${values.length}::uuid[])`);
    }
  }

  const { clause: schoolClause, params: schoolParams } = scopeBySchool(req, values.length);
  if (schoolClause !== '1=1') {
    conditions.push(`m.${schoolClause}`);
    values.push(...schoolParams);
  }

  const whereClause = conditions.join(' AND ');
  const orderBy = buildOrderBy(sort, undefined, MARK_SORT_ALLOWLIST, 'm.created_at ASC');

  const countQuery = `SELECT COUNT(*)::int AS count FROM marks m WHERE ${whereClause}`;
  const [{ count: total }] = await db.raw(countQuery, values);

  const dataValues = [...values, limit, skip];
  const dataQuery = `
    SELECT m.*,
           s.first_name, s.last_name, s.roll_no, s.admission_no,
           sub.name AS subject_name, sub.code AS subject_code,
           u.email AS entered_by_email
    FROM marks m
    LEFT JOIN students s ON s.id = m.student_id
    LEFT JOIN subjects sub ON sub.id = m.subject_id
    LEFT JOIN users u ON u.id = m.entered_by_id
    WHERE ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${dataValues.length - 1}
    OFFSET $${dataValues.length}
  `;
  const rows = await db.raw(dataQuery, dataValues);

  const marks = rows.map(formatMark);
  const stats = getMarkStats(marks);
  const meta = getPaginationMeta(page, limit, total);

  return ApiResponse.success(
    res,
    { marks, stats, meta },
    'Marks retrieved successfully'
  );
});

// @desc    Save or update marks as drafts for a schedule
// @route   POST /api/v1/exams/:examId/schedules/:scheduleId/marks
// @access  Admin, Principal, Teacher
exports.bulkSaveMarks = catchAsync(async (req, res) => {
  const { examId, scheduleId } = req.params;
  const { marks } = req.body;

  const schedule = await assertScheduleBelongsToExam(req, examId, scheduleId);
  const exam = await db.findOne('exams', { id: examId, ...getSchoolFilter(req) });

  if (exam.is_result_published) {
    throw new ApiError('Cannot edit marks after results are published', 400);
  }

  const scale = await fetchDefaultGradingScale(exam.school_id);

  const results = { inserted: 0, updated: 0, errors: [] };

  for (const entry of marks) {
    try {
      if (Number(entry.marksObtained) > Number(schedule.max_marks)) {
        throw new Error(`Marks must be between 0 and ${schedule.max_marks}`);
      }

      const student = await db.findOne('students', {
        id: entry.student,
        ...getSchoolFilter(req),
      });
      if (!student) {
        throw new Error('Student not found');
      }
      if (student.status !== 'active') {
        throw new Error('Student is not active');
      }
      if (
        student.class_id !== schedule.class_id ||
        student.section_id !== schedule.section_id
      ) {
        throw new Error('Student is not enrolled in the scheduled class-section');
      }

      const percentage = (entry.marksObtained / schedule.max_marks) * 100;
      const grade = calculateGrade(percentage, scale);

      const filter = { exam_schedule_id: scheduleId, student_id: entry.student };
      const existing = await db.findOne('marks', {
        ...filter,
        ...getSchoolFilter(req),
      });

      if (existing && existing.status !== 'draft') {
        throw new Error('Only draft marks can be edited');
      }

      const update = {
        exam_id: examId,
        class_id: schedule.class_id,
        section_id: schedule.section_id,
        subject_id: schedule.subject_id,
        marks_obtained: entry.marksObtained,
        max_marks: schedule.max_marks,
        pass_marks: schedule.pass_marks,
        percentage: +percentage.toFixed(2),
        grade,
        remarks: entry.remarks || '',
        status: 'draft',
        entered_by_id: req.user.id,
        academic_year_id: schedule.academic_year_id,
        school_id: req.user.school_id,
      };

      if (existing) {
        await db.update('marks', update, { id: existing.id });
        results.updated++;
      } else {
        await db.insert('marks', { ...filter, ...update });
        results.inserted++;
      }
    } catch (error) {
      results.errors.push({ student: entry.student, error: error.message });
    }
  }

  return ApiResponse.success(
    res,
    results,
    `Marks saved: ${results.inserted} inserted, ${results.updated} updated`,
    results.errors.length > 0 ? 207 : 200
  );
});

// @desc    Submit draft marks for verification
// @route   POST /api/v1/exams/:examId/schedules/:scheduleId/submit
// @access  Admin, Principal, Teacher
exports.submitMarks = catchAsync(async (req, res) => {
  const { examId, scheduleId } = req.params;

  await assertScheduleBelongsToExam(req, examId, scheduleId);

  const result = await db.update(
    'marks',
    { status: 'submitted' },
    { exam_schedule_id: scheduleId, status: 'draft', ...getSchoolFilter(req) }
  );

  return ApiResponse.success(
    res,
    { submittedCount: result.length },
    `${result.length} mark record(s) submitted for verification`
  );
});

// @desc    Verify submitted marks
// @route   POST /api/v1/exams/:examId/schedules/:scheduleId/verify
// @access  Admin, Principal
exports.verifyMarks = catchAsync(async (req, res) => {
  const { examId, scheduleId } = req.params;

  await assertScheduleBelongsToExam(req, examId, scheduleId);

  const result = await db.update(
    'marks',
    { status: 'verified', verified_by_id: req.user.id },
    { exam_schedule_id: scheduleId, status: 'submitted', ...getSchoolFilter(req) }
  );

  return ApiResponse.success(
    res,
    { verifiedCount: result.length },
    `${result.length} mark record(s) verified`
  );
});

// @desc    Get complete result for a student in an exam
// @route   GET /api/v1/exams/:examId/students/:studentId/result
// @access  Admin, Principal, Teacher
exports.getStudentResult = catchAsync(async (req, res) => {
  const { examId, studentId } = req.params;

  const { clause: examClause, params: examParams } = scopeBySchool(req, 1);
  const examSchoolCondition = examClause === '1=1' ? examClause : `e.${examClause}`;

  const { clause: studentClause, params: studentParams } = scopeBySchool(req, 1);
  const studentSchoolCondition =
    studentClause === '1=1' ? studentClause : `s.${studentClause}`;

  const { clause: marksClause, params: marksParams } = scopeBySchool(req, 2);
  const marksSchoolCondition =
    marksClause === '1=1' ? marksClause : `m.${marksClause}`;

  const [examRows, studentRows, marksRows] = await Promise.all([
    db.raw(
      `SELECT e.*, ay.name AS academic_year_name
       FROM exams e
       LEFT JOIN academic_years ay ON ay.id = e.academic_year_id
       WHERE e.id = $1 AND ${examSchoolCondition}`,
      [examId, ...examParams]
    ),
    db.raw(
      `SELECT s.*, c.name AS class_name
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE s.id = $1 AND ${studentSchoolCondition}`,
      [studentId, ...studentParams]
    ),
    db.raw(
      `SELECT m.*,
              sub.name AS subject_name, sub.code AS subject_code,
              es.exam_date,
              es.max_marks AS schedule_max_marks,
              es.pass_marks AS schedule_pass_marks
       FROM marks m
       LEFT JOIN subjects sub ON sub.id = m.subject_id
       LEFT JOIN exam_schedules es ON es.id = m.exam_schedule_id
       WHERE m.exam_id = $1 AND m.student_id = $2 AND ${marksSchoolCondition}`,
      [examId, studentId, ...marksParams]
    ),
  ]);

  const exam = examRows[0] ? formatExam(examRows[0]) : null;
  const student = studentRows[0] ? formatStudent(studentRows[0]) : null;
  const marks = marksRows.map(formatMark);

  if (!exam) {
    throw new ApiError('Exam not found', 404);
  }
  if (!student) {
    throw new ApiError('Student not found', 404);
  }

  if (['student', 'parent'].includes(req.user.role)) {
    const isPublished = exam.isResultPublished || marks.every((m) => m.status === 'published');
    if (!isPublished) {
      throw new ApiError('Results are not published yet', 403);
    }
  }

  const scale = await fetchDefaultGradingScale(examRows[0].school_id);

  const subjectMarks = marks.map((m) => ({
    ...m,
    isPassing: m.marksObtained >= m.passMarks,
  }));

  const totalObtained = subjectMarks.reduce(
    (sum, m) => sum + (m.marksObtained || 0),
    0
  );
  const totalMax = subjectMarks.reduce((sum, m) => sum + m.maxMarks, 0);
  const overallPercentage =
    totalMax > 0 ? +((totalObtained / totalMax) * 100).toFixed(2) : 0;
  const overallGrade = calculateGrade(overallPercentage, scale);
  const hasPassed =
    subjectMarks.length > 0 &&
    subjectMarks.every((m) => m.marksObtained >= m.passMarks);

  const resultData = {
    student,
    exam,
    subjectMarks,
    summary: {
      totalObtained,
      totalMax,
      percentage: overallPercentage,
      grade: overallGrade,
      result: hasPassed ? 'pass' : 'fail',
    },
  };

  return ApiResponse.success(
    res,
    resultData,
    'Student result retrieved successfully'
  );
});

// @desc    Get aggregate results for a class (and optional section)
// @route   GET /api/v1/exams/:examId/class/:classId/results
// @access  Admin, Principal, Teacher
exports.getClassResults = catchAsync(async (req, res) => {
  const { examId, classId } = req.params;
  const { sectionId } = req.query;

  const exam = await db.findOne('exams', { id: examId, ...getSchoolFilter(req) });
  if (!exam) {
    throw new ApiError('Exam not found', 404);
  }

  const studentValues = [classId, 'active'];
  let studentWhere = 'WHERE s.class_id = $1 AND s.status = $2';
  if (sectionId) {
    studentValues.push(sectionId);
    studentWhere += ` AND s.section_id = $${studentValues.length}`;
  }
  const { clause: studentClause, params: studentSchoolParams } = scopeBySchool(
    req,
    studentValues.length
  );
  if (studentClause !== '1=1') {
    studentWhere += ` AND s.${studentClause}`;
    studentValues.push(...studentSchoolParams);
  }

  const marksValues = [examId, classId];
  let marksWhere = 'WHERE m.exam_id = $1 AND m.class_id = $2';
  if (sectionId) {
    marksValues.push(sectionId);
    marksWhere += ` AND m.section_id = $${marksValues.length}`;
  }
  const { clause: marksClause, params: marksSchoolParams } = scopeBySchool(
    req,
    marksValues.length
  );
  if (marksClause !== '1=1') {
    marksWhere += ` AND m.${marksClause}`;
    marksValues.push(...marksSchoolParams);
  }

  const schedulesValues = [examId, classId];
  let schedulesWhere = 'WHERE es.exam_id = $1 AND es.class_id = $2';
  if (sectionId) {
    schedulesValues.push(sectionId);
    schedulesWhere += ` AND es.section_id = $${schedulesValues.length}`;
  }
  const { clause: schedulesClause, params: schedulesSchoolParams } = scopeBySchool(
    req,
    schedulesValues.length
  );
  if (schedulesClause !== '1=1') {
    schedulesWhere += ` AND es.${schedulesClause}`;
    schedulesValues.push(...schedulesSchoolParams);
  }

  const [studentRows, marksRows, schedulesRows] = await Promise.all([
    db.raw(
      `SELECT s.*, c.name AS class_name
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       ${studentWhere}
       ORDER BY s.roll_no ASC`,
      studentValues
    ),
    db.raw(
      `SELECT m.*, sub.name AS subject_name, sub.code AS subject_code
       FROM marks m
       LEFT JOIN subjects sub ON sub.id = m.subject_id
       ${marksWhere}`,
      marksValues
    ),
    db.raw(
      `SELECT es.*, sub.name AS subject_name, sub.code AS subject_code
       FROM exam_schedules es
       LEFT JOIN subjects sub ON sub.id = es.subject_id
       ${schedulesWhere}`,
      schedulesValues
    ),
  ]);

  const students = studentRows.map(formatStudent);
  const marks = marksRows.map(formatMark);
  // schedules is fetched to preserve the original behaviour even though it is not returned.
  // eslint-disable-next-line no-unused-vars
  const schedules = schedulesRows;

  if (['student', 'parent'].includes(req.user.role)) {
    const isPublished = exam.is_result_published || marks.every((m) => m.status === 'published');
    if (!isPublished) {
      throw new ApiError('Results are not published yet', 403);
    }
  }

  const scale = await fetchDefaultGradingScale(exam.school_id);

  const studentResults = [];
  let passCount = 0;
  let failCount = 0;

  students.forEach((student) => {
    const studentMarks = marks.filter(
      (m) => m.student && m.student._id === student._id
    );
    const totalObtained = studentMarks.reduce(
      (sum, m) => sum + (m.marksObtained || 0),
      0
    );
    const totalMax = studentMarks.reduce((sum, m) => sum + m.maxMarks, 0);
    const percentage =
      totalMax > 0 ? +((totalObtained / totalMax) * 100).toFixed(2) : 0;
    const hasPassed =
      studentMarks.length > 0 &&
      studentMarks.every((m) => m.marksObtained >= m.passMarks);

    if (hasPassed) passCount++;
    else failCount++;

    studentResults.push({
      student,
      totalObtained,
      totalMax,
      percentage,
      grade: calculateGrade(percentage, scale),
      result: hasPassed ? 'pass' : 'fail',
      subjectCount: studentMarks.length,
    });
  });

  studentResults.sort((a, b) => b.percentage - a.percentage);
  const topPerformers = studentResults.slice(0, 5);

  const subjectStats = {};
  marks.forEach((m) => {
    const subjectId = m.subject?._id;
    if (!subjectId) return;
    if (!subjectStats[subjectId]) {
      subjectStats[subjectId] = {
        subject: m.subject,
        totalMarks: 0,
        count: 0,
        highest: m.marksObtained,
        lowest: m.marksObtained,
      };
    }
    subjectStats[subjectId].totalMarks += m.marksObtained || 0;
    subjectStats[subjectId].count += 1;
    subjectStats[subjectId].highest = Math.max(
      subjectStats[subjectId].highest,
      m.marksObtained
    );
    subjectStats[subjectId].lowest = Math.min(
      subjectStats[subjectId].lowest,
      m.marksObtained
    );
  });

  const subjectWiseAverages = Object.values(subjectStats).map((s) => ({
    subject: s.subject,
    average: +(s.totalMarks / s.count).toFixed(2),
    highest: s.highest,
    lowest: s.lowest,
    totalStudents: s.count,
  }));

  const summary = {
    totalStudents: students.length,
    passCount,
    failCount,
    passPercentage:
      students.length > 0
        ? +((passCount / students.length) * 100).toFixed(2)
        : 0,
    classAverage:
      studentResults.length > 0
        ? +(
            studentResults.reduce((sum, r) => sum + r.percentage, 0) /
            studentResults.length
          ).toFixed(2)
        : 0,
  };

  return ApiResponse.success(
    res,
    { summary, topPerformers, subjectWiseAverages, studentResults },
    'Class results retrieved successfully'
  );
});

module.exports.calculateGrade = calculateGrade;
