const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes are protected
router.use(authenticate);

// Main CRUD routes
router
  .route('/')
  .get(teacherController.getTeachers)
  .post(authorize('admin'), teacherController.createTeacher);

router
  .route('/:id')
  .get(teacherController.getTeacher)
  .put(authorize('admin'), teacherController.updateTeacher)
  .delete(authorize('admin'), teacherController.deleteTeacher);

// Subject assignment routes
router.post('/:id/assign-subject', authorize('admin'), teacherController.assignSubject);
router.delete('/:id/remove-subject', authorize('admin'), teacherController.removeSubject);

// Workload route
router.get('/:id/workload', teacherController.getWorkload);

module.exports = router;
