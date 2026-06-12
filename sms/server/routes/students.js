const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes are protected
router.use(authenticate);

// Search (before :id routes to avoid conflict)
router.get('/search', authorize('admin', 'teacher'), studentController.searchStudents);

// Get students by class
router.get('/class/:classId', authorize('admin', 'teacher'), studentController.getStudentsByClass);

// Bulk import
router.post('/bulk-import', authorize('admin'), studentController.bulkImport);

// Main CRUD routes
router
  .route('/')
  .get(authorize('admin', 'teacher'), studentController.getStudents)
  .post(authorize('admin'), studentController.createStudent);

router
  .route('/:id')
  .get(authorize('admin', 'teacher'), studentController.getStudent)
  .put(authorize('admin'), studentController.updateStudent)
  .delete(authorize('admin'), studentController.deleteStudent);

// Student-specific sub-routes
router.get('/:id/attendance', authorize('admin', 'teacher'), studentController.getStudentAttendance);
router.get('/:id/fees', authorize('admin', 'teacher'), studentController.getStudentFees);
router.get('/:id/results', authorize('admin', 'teacher'), studentController.getStudentResults);

module.exports = router;
