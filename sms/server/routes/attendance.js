const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes are protected - teachers and admins can manage attendance
router.use(authenticate);
router.use(authorize('admin', 'teacher'));

// Mark attendance (single)
router.post('/mark', attendanceController.markAttendance);

// Bulk mark attendance
router.post('/bulk-mark', attendanceController.bulkMark);

// Get attendance by date and class
router.get('/date/:date/class/:classId', attendanceController.getByDate);

// Get attendance by student
router.get('/student/:studentId', attendanceController.getByStudent);

// Monthly report
router.get('/monthly-report', attendanceController.getMonthlyReport);

// Defaulters (attendance < 75%)
router.get('/defaulters', attendanceController.getDefaulters);

// Class summary
router.get('/class-summary', attendanceController.getClassSummary);

// Update attendance record
router.put('/:id', attendanceController.updateAttendance);

module.exports = router;
