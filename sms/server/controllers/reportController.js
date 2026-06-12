const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const FeePayment = require('../models/FeePayment');
const FeeStructure = require('../models/FeeStructure');
const Mark = require('../models/Mark');
const Exam = require('../models/Exam');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get dashboard statistics
// @route   GET /api/v1/reports/dashboard
// @access  Admin
exports.getDashboardStats = catchAsync(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalStudents,
    totalTeachers,
    totalClasses,
    presentToday,
    feeCollectedToday,
    pendingFees,
  ] = await Promise.all([
    Student.countDocuments({ status: 'active' }),
    Teacher.countDocuments({ status: 'active' }),
    Class.countDocuments({ status: 'active' }),
    Attendance.countDocuments({
      date: today,
      status: 'present',
    }),
    FeePayment.aggregate([
      {
        $match: {
          paymentDate: { $gte: today },
          status: 'paid',
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    FeePayment.aggregate([
      { $match: { status: { $in: ['pending', 'partial'] } } },
      { $group: { _id: null, total: { $sum: '$netAmount' } } },
    ]),
  ]);

  const stats = {
    students: totalStudents,
    teachers: totalTeachers,
    classes: totalClasses,
    presentToday,
    feeCollectedToday: feeCollectedToday.length > 0 ? feeCollectedToday[0].total : 0,
    pendingDues: pendingFees.length > 0 ? pendingFees[0].total : 0,
  };

  return ApiResponse.success(res, { stats }, 'Dashboard stats retrieved');
});

// @desc    Get student statistics
// @route   GET /api/v1/reports/students
// @access  Admin
exports.getStudentStats = catchAsync(async (req, res) => {
  const { academicYear } = req.query;

  // Enrollment by class (for bar chart)
  const enrollmentByClass = await Student.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$currentClass',
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'classes',
        localField: '_id',
        foreignField: '_id',
        as: 'classInfo',
      },
    },
    { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        className: { $concat: ['$classInfo.name', ' - ', '$classInfo.section'] },
        count: 1,
      },
    },
    { $sort: { className: 1 } },
  ]);

  // Gender ratio (for pie chart)
  const genderRatio = await Student.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$gender',
        count: { $sum: 1 },
      },
    },
  ]);

  // Monthly admissions (for line chart) - current year
  const currentYear = new Date().getFullYear();
  const monthlyAdmissions = await Student.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(currentYear, 0, 1),
          $lte: new Date(currentYear, 11, 31),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fill all months
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const filledMonthlyAdmissions = months.map((month, index) => ({
    month,
    monthNumber: index + 1,
    count: monthlyAdmissions.find((m) => m._id === index + 1)?.count || 0,
  }));

  return ApiResponse.success(
    res,
    {
      enrollmentByClass,
      genderRatio,
      monthlyAdmissions: filledMonthlyAdmissions,
    },
    'Student stats retrieved'
  );
});

// @desc    Get fee statistics
// @route   GET /api/v1/reports/fees
// @access  Admin
exports.getFeeStats = catchAsync(async (req, res) => {
  const { year } = req.query;
  const targetYear = year || new Date().getFullYear();

  const startDate = new Date(targetYear, 0, 1);
  const endDate = new Date(targetYear, 11, 31, 23, 59, 59);

  // Monthly collection
  const monthlyCollection = await FeePayment.aggregate([
    {
      $match: {
        paymentDate: { $gte: startDate, $lte: endDate },
        status: 'paid',
      },
    },
    {
      $group: {
        _id: { $month: '$paymentDate' },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const filledMonthly = months.map((month, index) => ({
    month,
    total: monthlyCollection.find((m) => m._id === index + 1)?.total || 0,
    count: monthlyCollection.find((m) => m._id === index + 1)?.count || 0,
  }));

  // Outstanding by class
  const outstandingByClass = await FeePayment.aggregate([
    { $match: { status: { $in: ['pending', 'partial'] } } },
    {
      $lookup: {
        from: 'students',
        localField: 'student',
        foreignField: '_id',
        as: 'studentData',
      },
    },
    { $unwind: '$studentData' },
    {
      $group: {
        _id: '$studentData.currentClass',
        totalOutstanding: { $sum: '$netAmount' },
      },
    },
    {
      $lookup: {
        from: 'classes',
        localField: '_id',
        foreignField: '_id',
        as: 'classInfo',
      },
    },
    { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        className: { $concat: ['$classInfo.name', ' - ', '$classInfo.section'] },
        totalOutstanding: 1,
      },
    },
  ]);

  // Payment mode distribution
  const paymentModeDistribution = await FeePayment.aggregate([
    { $match: { status: 'paid' } },
    {
      $group: {
        _id: '$paymentMode',
        count: { $sum: 1 },
        total: { $sum: '$amount' },
      },
    },
  ]);

  return ApiResponse.success(
    res,
    {
      monthlyCollection: filledMonthly,
      outstandingByClass,
      paymentModeDistribution,
    },
    'Fee stats retrieved'
  );
});

// @desc    Get attendance statistics
// @route   GET /api/v1/reports/attendance
// @access  Admin
exports.getAttendanceStats = catchAsync(async (req, res) => {
  const { month, year } = req.query;

  const targetMonth = month ? Number(month) - 1 : new Date().getMonth();
  const targetYear = year ? Number(year) : new Date().getFullYear();

  const startDate = new Date(targetYear, targetMonth, 1);
  const endDate = new Date(targetYear, targetMonth + 1, 0);

  // Class-wise attendance percentage
  const classWiseAttendance = await Attendance.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$class',
        total: { $sum: 1 },
        present: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: 'classes',
        localField: '_id',
        foreignField: '_id',
        as: 'classInfo',
      },
    },
    { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        className: { $concat: ['$classInfo.name', ' - ', '$classInfo.section'] },
        total: 1,
        present: 1,
        percentage: {
          $cond: [
            { $gt: ['$total', 0] },
            { $multiply: [{ $divide: ['$present', '$total'] }, 100] },
            0,
          ],
        },
      },
    },
  ]);

  // Monthly trend (last 6 months)
  const sixMonthsAgo = new Date(targetYear, targetMonth - 5, 1);
  const monthlyTrend = await Attendance.aggregate([
    {
      $match: {
        date: { $gte: sixMonthsAgo, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
        },
        total: { $sum: 1 },
        present: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] },
        },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // Defaulter count (< 75%)
  const allActiveStudents = await Student.countDocuments({ status: 'active' });

  const studentAttendance = await Attendance.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$student',
        total: { $sum: 1 },
        present: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] },
        },
      },
    },
    {
      $match: {
        $expr: {
          $lt: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 75],
        },
      },
    },
  ]);

  return ApiResponse.success(
    res,
    {
      classWiseAttendance,
      monthlyTrend,
      defaulterCount: studentAttendance.length,
      defaulterPercentage:
        allActiveStudents > 0
          ? ((studentAttendance.length / allActiveStudents) * 100).toFixed(2)
          : 0,
    },
    'Attendance stats retrieved'
  );
});

// @desc    Get exam statistics
// @route   GET /api/v1/reports/exams
// @access  Admin
exports.getExamStats = catchAsync(async (req, res) => {
  const { examId } = req.query;

  if (!examId) {
    return ApiResponse.success(res, { exams: await Exam.find().select('name type').lean() }, 'Available exams');
  }

  const marks = await Mark.find({ exam: examId })
    .populate('subject', 'name code')
    .lean();

  // Pass/fail ratio
  const passCount = marks.filter((m) => m.result === 'pass').length;
  const failCount = marks.filter((m) => m.result === 'fail').length;

  // Grade distribution
  const gradeDistribution = {};
  marks.forEach((m) => {
    const grade = m.grade || 'N/A';
    gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
  });

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

  return ApiResponse.success(
    res,
    {
      passFailRatio: { pass: passCount, fail: failCount },
      gradeDistribution,
      subjectWiseAverages,
    },
    'Exam stats retrieved'
  );
});
