const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const attendanceValidator = require('../validators/attendance');

router.use(authenticate);

// Mark attendance (single)
router.post(
  '/mark',
  authorize('admin', 'teacher'),
  validate(attendanceValidator.markAttendance),
  attendanceController.markAttendance
);

// Bulk mark attendance
router.post(
  '/bulk-mark',
  authorize('admin', 'teacher'),
  validate(attendanceValidator.bulkMarkAttendance),
  attendanceController.bulkMarkAttendance
);

// List attendance records
router.get(
  '/',
  authorize('admin', 'teacher', 'student', 'parent'),
  validate(attendanceValidator.attendanceQuery, 'query'),
  attendanceController.getAttendance
);

// Class-wise attendance report
router.get(
  '/report',
  authorize('admin', 'teacher'),
  validate(attendanceValidator.dateRangeClassQuery, 'query'),
  attendanceController.getReport
);

// Daily class summary
router.get(
  '/class-summary',
  authorize('admin', 'teacher'),
  validate(attendanceValidator.classSummaryQuery, 'query'),
  attendanceController.getClassSummary
);

// Monthly report
router.get(
  '/monthly-report',
  authorize('admin', 'teacher'),
  validate(attendanceValidator.monthlyReportQuery, 'query'),
  attendanceController.getMonthlyReport
);

// Defaulters
router.get(
  '/defaulters',
  authorize('admin', 'teacher'),
  validate(attendanceValidator.dateRangeClassQuery, 'query'),
  attendanceController.getDefaulters
);

// Attendance by date and class (section via query for backward compatibility)
router.get(
  '/date/:date/class/:classId',
  authorize('admin', 'teacher'),
  validate(attendanceValidator.dateClassParams, 'params'),
  attendanceController.getByDate
);

// Attendance by date, class and section
router.get(
  '/date/:date/class/:classId/section/:sectionId',
  authorize('admin', 'teacher'),
  validate(attendanceValidator.dateClassSectionParams, 'params'),
  attendanceController.getByDate
);

// Student attendance history
router.get(
  '/student/:studentId',
  authorize('admin', 'teacher', 'student', 'parent'),
  validate(attendanceValidator.studentParams, 'params'),
  validate(attendanceValidator.studentAttendanceQuery, 'query'),
  attendanceController.getByStudent
);

// Single attendance record
router.get(
  '/:id',
  authorize('admin', 'teacher', 'student', 'parent'),
  validate(attendanceValidator.attendanceParams, 'params'),
  attendanceController.getAttendanceById
);

// Update attendance record
router.put(
  '/:id',
  authorize('admin', 'teacher'),
  validate(attendanceValidator.attendanceParams, 'params'),
  validate(attendanceValidator.updateAttendance),
  attendanceController.updateAttendance
);

module.exports = router;
