const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes are protected
router.use(authenticate);

// Dashboard statistics
router.get('/dashboard', authorize('admin', 'teacher', 'accountant'), reportController.getDashboardStats);

// Student statistics
router.get('/students', authorize('admin', 'teacher'), reportController.getStudentStats);

// Fee statistics
router.get('/fees', authorize('admin', 'accountant'), reportController.getFeeStats);

// Attendance statistics
router.get('/attendance', authorize('admin', 'teacher'), reportController.getAttendanceStats);

// Exam statistics
router.get('/exams', authorize('admin', 'teacher'), reportController.getExamStats);

module.exports = router;
