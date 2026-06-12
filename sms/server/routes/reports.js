const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

// All routes are protected
router.use(authenticate);

// Dashboard statistics
router.get('/dashboard', reportController.getDashboardStats);

// Student statistics
router.get('/students', reportController.getStudentStats);

// Fee statistics
router.get('/fees', reportController.getFeeStats);

// Attendance statistics
router.get('/attendance', reportController.getAttendanceStats);

// Exam statistics
router.get('/exams', reportController.getExamStats);

module.exports = router;
