const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Class = require('../models/Class');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// @desc    Mark attendance for a single student
// @route   POST /api/v1/attendance/mark
// @access  Teacher
exports.markAttendance = catchAsync(async (req, res) => {
  const { student, class: classId, date, status, remarks } = req.body;

  if (!student || !classId || !date || !status) {
    throw new ApiError('Student, class, date, and status are required', 400);
  }

  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);

  // Check if attendance already marked for this student on this date
  const existingRecord = await Attendance.findOne({
    student,
    class: classId,
    date: attendanceDate,
  });

  if (existingRecord) {
    throw new ApiError(
      'Attendance already marked for this student on the given date. Use update instead.',
      409
    );
  }

  const attendance = await Attendance.create({
    student,
    class: classId,
    date: attendanceDate,
    status,
    remarks,
    markedBy: req.user.id,
  });

  const populatedAttendance = await Attendance.findById(attendance._id)
    .populate('student', 'firstName lastName rollNo')
    .populate('class', 'name section');

  return ApiResponse.success(
    res,
    { attendance: populatedAttendance },
    'Attendance marked successfully',
    201
  );
});

// @desc    Bulk mark attendance for a class
// @route   POST /api/v1/attendance/bulk-mark
// @access  Teacher
exports.bulkMark = catchAsync(async (req, res) => {
  const { class: classId, date, attendanceList } = req.body;

  if (!classId || !date || !Array.isArray(attendanceList) || attendanceList.length === 0) {
    throw new ApiError('Class, date, and attendance array are required', 400);
  }

  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);

  // Check for existing records on this date for this class
  const existingRecords = await Attendance.find({
    class: classId,
    date: attendanceDate,
  }).select('student');

  const existingStudentIds = new Set(
    existingRecords.map((r) => r.student.toString())
  );

  // Filter out already marked students
  const newRecords = attendanceList.filter(
    (item) => !existingStudentIds.has(item.student)
  );

  const skippedCount = attendanceList.length - newRecords.length;

  if (newRecords.length === 0) {
    return ApiResponse.success(
      res,
      { inserted: 0, skipped: skippedCount },
      'All attendance records already exist for this date'
    );
  }

  // Prepare attendance documents
  const attendanceDocs = newRecords.map((item) => ({
    student: item.student,
    class: classId,
    date: attendanceDate,
    status: item.status,
    remarks: item.remarks || '',
    markedBy: req.user.id,
  }));

  const inserted = await Attendance.insertMany(attendanceDocs, { ordered: false });

  return ApiResponse.success(
    res,
    { inserted: inserted.length, skipped: skippedCount },
    `Attendance marked for ${inserted.length} students (${skippedCount} skipped - already marked)`,
    201
  );
});

// @desc    Get attendance for a class on a specific date
// @route   GET /api/v1/attendance/date/:date/class/:classId
// @access  Teacher
exports.getByDate = catchAsync(async (req, res) => {
  const { date, classId } = req.params;

  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);

  const records = await Attendance.find({
    class: classId,
    date: attendanceDate,
  })
    .populate('student', 'firstName lastName rollNo admissionNo')
    .populate('class', 'name section')
    .sort('student.rollNo')
    .lean();

  // Get all active students in class for reference
  const allStudents = await Student.find({
    currentClass: classId,
    status: 'active',
  })
    .select('firstName lastName rollNo admissionNo')
    .sort('rollNo')
    .lean();

  // Map attendance status to students
  const attendanceMap = new Map(records.map((r) => [r.student._id.toString(), r]));

  const studentAttendance = allStudents.map((student) => ({
    student,
    attendance: attendanceMap.get(student._id.toString()) || null,
  }));

  const summary = {
    total: allStudents.length,
    present: records.filter((r) => r.status === 'present').length,
    absent: records.filter((r) => r.status === 'absent').length,
    late: records.filter((r) => r.status === 'late').length,
    halfDay: records.filter((r) => r.status === 'halfDay' || r.status === 'half_day').length,
    notMarked: allStudents.length - records.length,
  };

  return ApiResponse.success(
    res,
    { attendance: studentAttendance, summary },
    'Attendance records retrieved'
  );
});

// @desc    Get all attendance for a student
// @route   GET /api/v1/attendance/student/:studentId
// @access  Teacher
exports.getByStudent = catchAsync(async (req, res) => {
  const { studentId } = req.params;
  const { startDate, endDate, page = 1, limit = 30 } = req.query;

  const query = { student: studentId };

  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [records, total] = await Promise.all([
    Attendance.find(query)
      .populate('class', 'name section')
      .sort('-date')
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Attendance.countDocuments(query),
  ]);

  // Calculate summary
  const summary = {
    total,
    present: records.filter((r) => r.status === 'present').length,
    absent: records.filter((r) => r.status === 'absent').length,
    late: records.filter((r) => r.status === 'late').length,
    halfDay: records.filter((r) => r.status === 'halfDay' || r.status === 'half_day').length,
  };
  summary.percentage = total > 0 ? ((summary.present + summary.late * 0.5) / total * 100).toFixed(2) : 0;

  const meta = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return ApiResponse.success(res, { records, summary, meta }, 'Student attendance retrieved');
});

// @desc    Get monthly attendance report for a class
// @route   GET /api/v1/attendance/monthly-report
// @access  Teacher
exports.getMonthlyReport = catchAsync(async (req, res) => {
  const { classId, month, year } = req.query;

  if (!classId || !month || !year) {
    throw new ApiError('Class, month, and year are required', 400);
  }

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);

  // Get all students in class
  const students = await Student.find({
    currentClass: classId,
    status: 'active',
  })
    .select('firstName lastName rollNo')
    .sort('rollNo')
    .lean();

  const studentIds = students.map((s) => s._id);

  // Aggregate attendance for the month
  const attendanceRecords = await Attendance.aggregate([
    {
      $match: {
        student: { $in: studentIds },
        date: { $gte: startOfMonth, $lte: endOfMonth },
      },
    },
    {
      $group: {
        _id: '$student',
        present: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] },
        },
        absent: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] },
        },
        late: {
          $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] },
        },
        halfDay: {
          $sum: { $cond: [{ $in: ['$status', ['halfDay', 'half_day']] }, 1, 0] },
        },
        total: { $sum: 1 },
      },
    },
  ]);

  // Calculate present percentage for each student
  const report = students.map((student) => {
    const record = attendanceRecords.find(
      (r) => r._id.toString() === student._id.toString()
    );

    const total = record?.total || 0;
    const present = record?.present || 0;
    const late = record?.late || 0;
    const absent = record?.absent || 0;
    const halfDay = record?.halfDay || 0;
    const percentage = total > 0 ? (((present + late * 0.5 + halfDay * 0.5) / total) * 100).toFixed(2) : 0;

    return {
      student,
      attendance: { total, present, absent, late, halfDay, percentage },
    };
  });

  // Class average
  const avgPercentage = report.length > 0
    ? (report.reduce((sum, r) => sum + Number(r.attendance.percentage), 0) / report.length).toFixed(2)
    : 0;

  return ApiResponse.success(
    res,
    { report, classAverage: avgPercentage, month, year },
    'Monthly attendance report retrieved'
  );
});

// @desc    Get attendance defaulters (< 75%)
// @route   GET /api/v1/attendance/defaulters
// @access  Teacher
exports.getDefaulters = catchAsync(async (req, res) => {
  const { classId, startDate, endDate } = req.query;

  if (!classId) {
    throw new ApiError('Class ID is required', 400);
  }

  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  // Get all students in class
  const students = await Student.find({
    currentClass: classId,
    status: 'active',
  })
    .select('firstName lastName rollNo fatherName')
    .lean();

  const studentIds = students.map((s) => s._id);

  // Aggregate attendance
  const attendanceRecords = await Attendance.aggregate([
    {
      $match: {
        student: { $in: studentIds },
        ...dateFilter,
      },
    },
    {
      $group: {
        _id: '$student',
        present: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] },
        },
        late: {
          $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] },
        },
        halfDay: {
          $sum: { $cond: [{ $in: ['$status', ['halfDay', 'half_day']] }, 1, 0] },
        },
        total: { $sum: 1 },
      },
    },
  ]);

  // Find defaulters (< 75%)
  const defaulters = [];
  students.forEach((student) => {
    const record = attendanceRecords.find(
      (r) => r._id.toString() === student._id.toString()
    );

    const total = record?.total || 0;
    if (total === 0) return;

    const effectivePresent = (record?.present || 0) + (record?.late || 0) * 0.5 + (record?.halfDay || 0) * 0.5;
    const percentage = (effectivePresent / total) * 100;

    if (percentage < 75) {
      defaulters.push({
        student,
        totalDays: total,
        presentDays: record?.present || 0,
        percentage: percentage.toFixed(2),
      });
    }
  });

  // Sort by lowest percentage first
  defaulters.sort((a, b) => Number(a.percentage) - Number(b.percentage));

  return ApiResponse.success(
    res,
    { defaulters, count: defaulters.length },
    'Attendance defaulters retrieved'
  );
});

// @desc    Get daily class summary
// @route   GET /api/v1/attendance/class-summary
// @access  Teacher
exports.getClassSummary = catchAsync(async (req, res) => {
  const { classId, date } = req.query;

  if (!classId || !date) {
    throw new ApiError('Class ID and date are required', 400);
  }

  const queryDate = new Date(date);
  queryDate.setHours(0, 0, 0, 0);

  const [totalStudents, records] = await Promise.all([
    Student.countDocuments({ currentClass: classId, status: 'active' }),
    Attendance.find({ class: classId, date: queryDate }).lean(),
  ]);

  const present = records.filter((r) => r.status === 'present').length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const late = records.filter((r) => r.status === 'late').length;
  const halfDay = records.filter((r) => r.status === 'halfDay' || r.status === 'half_day').length;
  const notMarked = totalStudents - records.length;

  const summary = {
    date: queryDate,
    totalStudents,
    marked: records.length,
    notMarked,
    present,
    absent,
    late,
    halfDay,
    presentPercentage: totalStudents > 0 ? ((present / totalStudents) * 100).toFixed(2) : 0,
    absentPercentage: totalStudents > 0 ? ((absent / totalStudents) * 100).toFixed(2) : 0,
    latePercentage: totalStudents > 0 ? ((late / totalStudents) * 100).toFixed(2) : 0,
  };

  return ApiResponse.success(res, { summary }, 'Class attendance summary retrieved');
});

// @desc    Update a specific attendance record
// @route   PUT /api/v1/attendance/:id
// @access  Teacher
exports.updateAttendance = catchAsync(async (req, res) => {
  const { status, remarks } = req.body;

  const attendance = await Attendance.findById(req.params.id);
  if (!attendance) {
    throw new ApiError('Attendance record not found', 404);
  }

  if (status) attendance.status = status;
  if (remarks !== undefined) attendance.remarks = remarks;
  attendance.updatedBy = req.user.id;

  await attendance.save();

  const updatedAttendance = await Attendance.findById(attendance._id)
    .populate('student', 'firstName lastName rollNo')
    .populate('class', 'name section');

  return ApiResponse.success(
    res,
    { attendance: updatedAttendance },
    'Attendance record updated successfully'
  );
});
