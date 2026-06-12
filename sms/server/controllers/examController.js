const Exam = require('../models/Exam');
const Mark = require('../models/Mark');
const Class = require('../models/Class');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// @desc    Get all exams with filters
// @route   GET /api/v1/exams
// @access  Admin, Teacher
exports.getExams = catchAsync(async (req, res) => {
  const {
    type,
    class: classId,
    status,
    academicYear,
    page = 1,
    limit = 10,
    sort = '-createdAt',
  } = req.query;

  const query = {};

  if (type) query.type = type;
  if (classId) query.class = classId;
  if (status) query.status = status;
  if (academicYear) query.academicYear = academicYear;

  const skip = (Number(page) - 1) * Number(limit);

  const [exams, total] = await Promise.all([
    Exam.find(query)
      .populate('class', 'name section')
      .populate('subjects.subject', 'name code')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Exam.countDocuments(query),
  ]);

  const meta = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return ApiResponse.success(res, { exams, meta }, 'Exams retrieved successfully');
});

// @desc    Get single exam with subject schedules
// @route   GET /api/v1/exams/:id
// @access  Admin, Teacher
exports.getExam = catchAsync(async (req, res) => {
  const exam = await Exam.findById(req.params.id)
    .populate('class', 'name section')
    .populate('subjects.subject', 'name code maxMarks')
    .lean();

  if (!exam) {
    throw new ApiError('Exam not found', 404);
  }

  return ApiResponse.success(res, { exam }, 'Exam retrieved successfully');
});

// @desc    Create exam with subject schedules
// @route   POST /api/v1/exams
// @access  Admin, Teacher
exports.createExam = catchAsync(async (req, res) => {
  const {
    name,
    type,
    class: classId,
    academicYear,
    startDate,
    endDate,
    subjects = [],
    maxMarks,
    passPercentage,
    description,
  } = req.body;

  const exam = await Exam.create({
    name,
    type,
    class: classId,
    academicYear,
    startDate,
    endDate,
    subjects,
    maxMarks,
    passPercentage,
    description,
  });

  const populatedExam = await Exam.findById(exam._id)
    .populate('class', 'name section')
    .populate('subjects.subject', 'name code');

  return ApiResponse.success(res, { exam: populatedExam }, 'Exam created successfully', 201);
});

// @desc    Update exam
// @route   PUT /api/v1/exams/:id
// @access  Admin
exports.updateExam = catchAsync(async (req, res) => {
  const {
    name,
    type,
    startDate,
    endDate,
    subjects,
    maxMarks,
    passPercentage,
    status,
    description,
  } = req.body;

  const exam = await Exam.findById(req.params.id);
  if (!exam) {
    throw new ApiError('Exam not found', 404);
  }

  // Don't allow update if exam is already published
  if (exam.status === 'published') {
    throw new ApiError('Cannot update a published exam', 400);
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (type) updateData.type = type;
  if (startDate) updateData.startDate = startDate;
  if (endDate) updateData.endDate = endDate;
  if (subjects) updateData.subjects = subjects;
  if (maxMarks) updateData.maxMarks = maxMarks;
  if (passPercentage) updateData.passPercentage = passPercentage;
  if (status) updateData.status = status;
  if (description !== undefined) updateData.description = description;

  const updatedExam = await Exam.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  )
    .populate('class', 'name section')
    .populate('subjects.subject', 'name code');

  return ApiResponse.success(res, { exam: updatedExam }, 'Exam updated successfully');
});

// @desc    Delete exam (only if no marks entered)
// @route   DELETE /api/v1/exams/:id
// @access  Admin
exports.deleteExam = catchAsync(async (req, res) => {
  const exam = await Exam.findById(req.params.id);
  if (!exam) {
    throw new ApiError('Exam not found', 404);
  }

  // Check if marks have been entered
  const marksCount = await Mark.countDocuments({ exam: exam._id });
  if (marksCount > 0) {
    throw new ApiError(
      `Cannot delete exam. ${marksCount} mark entries exist. Delete marks first.`,
      400
    );
  }

  await Exam.findByIdAndDelete(req.params.id);

  return ApiResponse.success(res, null, 'Exam deleted successfully');
});

// @desc    Add/update marks for students
// @route   POST /api/v1/exams/:examId/subjects/:subjectId/marks
// @access  Teacher
exports.addMarks = catchAsync(async (req, res) => {
  const { examId, subjectId } = req.params;
  const { marks } = req.body; // Array of { student, marksObtained, remarks }

  if (!Array.isArray(marks) || marks.length === 0) {
    throw new ApiError('Marks array is required', 400);
  }

  // Get exam details for validation
  const exam = await Exam.findById(examId);
  if (!exam) {
    throw new ApiError('Exam not found', 404);
  }

  // Find maxMarks for this subject in exam
  const subjectSchedule = exam.subjects.find(
    (s) => s.subject?.toString() === subjectId
  );

  const maxMarks = subjectSchedule?.maxMarks || exam.maxMarks || 100;

  const results = {
    inserted: 0,
    updated: 0,
    errors: [],
  };

  for (const markEntry of marks) {
    try {
      // Validate marks range
      if (markEntry.marksObtained < 0 || markEntry.marksObtained > maxMarks) {
        throw new Error(
          `Marks must be between 0 and ${maxMarks}. Got ${markEntry.marksObtained}`
        );
      }

      // Calculate grade and percentage
      const percentage = (markEntry.marksObtained / maxMarks) * 100;
      const grade = calculateGrade(percentage);
      const passFail = percentage >= (exam.passPercentage || 33) ? 'pass' : 'fail';

      // Upsert mark
      const filter = {
        exam: examId,
        subject: subjectId,
        student: markEntry.student,
      };

      const update = {
        marksObtained: markEntry.marksObtained,
        maxMarks,
        percentage: percentage.toFixed(2),
        grade,
        status: passFail,
        remarks: markEntry.remarks || '',
        recordedBy: req.user.id,
      };

      const existingMark = await Mark.findOne(filter);

      if (existingMark) {
        await Mark.findOneAndUpdate(filter, update, { new: true });
        results.updated++;
      } else {
        await Mark.create({
          ...filter,
          ...update,
          class: exam.class,
        });
        results.inserted++;
      }
    } catch (error) {
      results.errors.push({
        student: markEntry.student,
        error: error.message,
      });
    }
  }

  return ApiResponse.success(
    res,
    results,
    `Marks processed: ${results.inserted} inserted, ${results.updated} updated`,
    results.errors.length > 0 ? 207 : 200
  );
});

// @desc    Get marks for an exam + subject + class
// @route   GET /api/v1/exams/:examId/subjects/:subjectId/marks
// @access  Admin, Teacher
exports.getMarks = catchAsync(async (req, res) => {
  const { examId, subjectId } = req.params;

  const marks = await Mark.find({ exam: examId, subject: subjectId })
    .populate('student', 'firstName lastName rollNo admissionNo')
    .populate('subject', 'name code')
    .populate('exam', 'name type')
    .sort('student.rollNo')
    .lean();

  // Calculate statistics
  const stats = {
    total: marks.length,
    highest: marks.length > 0 ? Math.max(...marks.map((m) => m.marksObtained)) : 0,
    lowest: marks.length > 0 ? Math.min(...marks.map((m) => m.marksObtained)) : 0,
    average:
      marks.length > 0
        ? (marks.reduce((sum, m) => sum + m.marksObtained, 0) / marks.length).toFixed(2)
        : 0,
    passCount: marks.filter((m) => m.status === 'pass').length,
    failCount: marks.filter((m) => m.status === 'fail').length,
  };

  return ApiResponse.success(res, { marks, stats }, 'Marks retrieved successfully');
});

// @desc    Publish exam results
// @route   POST /api/v1/exams/:id/publish
// @access  Admin
exports.publishResults = catchAsync(async (req, res) => {
  const exam = await Exam.findById(req.params.id);
  if (!exam) {
    throw new ApiError('Exam not found', 404);
  }

  if (exam.status === 'published') {
    throw new ApiError('Exam results are already published', 400);
  }

  // Update exam status
  exam.status = 'published';
  exam.publishedAt = new Date();
  await exam.save();

  // Update all related marks to published
  await Mark.updateMany(
    { exam: exam._id },
    { status: 'published' }
  );

  return ApiResponse.success(res, { exam }, 'Results published successfully');
});

// @desc    Get complete result for a student in an exam
// @route   GET /api/v1/exams/:examId/students/:studentId/result
// @access  Admin, Teacher
exports.getResult = catchAsync(async (req, res) => {
  const { examId, studentId } = req.params;

  const [exam, marks, student] = await Promise.all([
    Exam.findById(examId)
      .populate('class', 'name section')
      .populate('subjects.subject', 'name code maxMarks')
      .lean(),
    Mark.find({ exam: examId, student: studentId })
      .populate('subject', 'name code')
      .lean(),
    Student.findById(studentId)
      .select('firstName lastName rollNo admissionNo currentClass')
      .lean(),
  ]);

  if (!exam) {
    throw new ApiError('Exam not found', 404);
  }

  if (!student) {
    throw new ApiError('Student not found', 404);
  }

  // Calculate total and percentage
  const totalObtained = marks.reduce((sum, m) => sum + m.marksObtained, 0);
  const totalMax = marks.reduce((sum, m) => sum + m.maxMarks, 0);
  const overallPercentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0;
  const overallGrade = calculateGrade(Number(overallPercentage));
  const result = marks.every((m) => m.status === 'pass' || m.status === 'published') ? 'pass' : 'fail';

  const resultData = {
    student,
    exam: { name: exam.name, type: exam.type, academicYear: exam.academicYear },
    subjectMarks: marks,
    summary: {
      totalObtained,
      totalMax,
      percentage: overallPercentage,
      grade: overallGrade,
      result,
    },
  };

  return ApiResponse.success(res, resultData, 'Student result retrieved');
});

// @desc    Get aggregate results for a class
// @route   GET /api/v1/exams/:examId/class/:classId/results
// @access  Admin, Teacher
exports.getClassResult = catchAsync(async (req, res) => {
  const { examId, classId } = req.params;

  const [exam, students, marks] = await Promise.all([
    Exam.findById(examId).lean(),
    Student.find({ currentClass: classId, status: 'active' })
      .select('firstName lastName rollNo')
      .lean(),
    Mark.find({ exam: examId })
      .populate('subject', 'name code')
      .lean(),
  ]);

  if (!exam) {
    throw new ApiError('Exam not found', 404);
  }

  const studentIds = students.map((s) => s._id.toString());

  // Calculate per-student results
  const studentResults = [];
  let passCount = 0;
  let failCount = 0;

  students.forEach((student) => {
    const studentMarks = marks.filter((m) => m.student.toString() === student._id.toString());
    const totalObtained = studentMarks.reduce((sum, m) => sum + m.marksObtained, 0);
    const totalMax = studentMarks.reduce((sum, m) => sum + m.maxMarks, 0);
    const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0;
    const hasPassed = studentMarks.every((m) => m.status === 'pass' || m.status === 'published');

    if (hasPassed) passCount++;
    else failCount++;

    studentResults.push({
      student,
      totalObtained,
      totalMax,
      percentage: Number(percentage),
      grade: calculateGrade(Number(percentage)),
      result: hasPassed ? 'pass' : 'fail',
      subjectCount: studentMarks.length,
    });
  });

  // Top performers
  studentResults.sort((a, b) => b.percentage - a.percentage);
  const topPerformers = studentResults.slice(0, 5);

  // Subject-wise averages
  const subjectStats = {};
  marks.forEach((m) => {
    const subjId = m.subject?._id?.toString();
    if (!subjId) return;
    if (!subjectStats[subjId]) {
      subjectStats[subjId] = {
        subject: m.subject,
        totalMarks: 0,
        count: 0,
        highest: m.marksObtained,
        lowest: m.marksObtained,
      };
    }
    subjectStats[subjId].totalMarks += m.marksObtained;
    subjectStats[subjId].count += 1;
    subjectStats[subjId].highest = Math.max(subjectStats[subjId].highest, m.marksObtained);
    subjectStats[subjId].lowest = Math.min(subjectStats[subjId].lowest, m.marksObtained);
  });

  const subjectWiseAverages = Object.values(subjectStats).map((s) => ({
    subject: s.subject,
    average: (s.totalMarks / s.count).toFixed(2),
    highest: s.highest,
    lowest: s.lowest,
    totalStudents: s.count,
  }));

  const summary = {
    totalStudents: students.length,
    passCount,
    failCount,
    passPercentage: students.length > 0 ? ((passCount / students.length) * 100).toFixed(2) : 0,
    classAverage: studentResults.length > 0
      ? (studentResults.reduce((sum, r) => sum + r.percentage, 0) / studentResults.length).toFixed(2)
      : 0,
  };

  return ApiResponse.success(
    res,
    { summary, topPerformers, subjectWiseAverages, studentResults },
    'Class results retrieved'
  );
});

// Helper function to calculate grade
function calculateGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}
