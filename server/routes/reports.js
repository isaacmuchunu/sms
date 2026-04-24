const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const reportValidators = require('../validators/reports');

// All routes are protected
router.use(authenticate);

// Dashboard KPIs
router.get(
  '/dashboard',
  authorize('admin', 'principal', 'teacher', 'accountant', 'librarian'),
  validate(reportValidators.dashboardQuerySchema, 'query'),
  reportController.getDashboard
);

// Student statistics
router.get(
  '/students',
  authorize('admin', 'principal', 'teacher'),
  validate(reportValidators.studentStatsQuerySchema, 'query'),
  reportController.getStudentStats
);

// Fee statistics
router.get(
  '/fees',
  authorize('admin', 'principal', 'accountant'),
  validate(reportValidators.feeStatsQuerySchema, 'query'),
  reportController.getFeeStats
);

// Attendance statistics
router.get(
  '/attendance',
  authorize('admin', 'principal', 'teacher'),
  validate(reportValidators.attendanceStatsQuerySchema, 'query'),
  reportController.getAttendanceStats
);

// Exam statistics
router.get(
  '/exams',
  authorize('admin', 'principal', 'teacher'),
  validate(reportValidators.examStatsQuerySchema, 'query'),
  reportController.getExamStats
);

module.exports = router;
