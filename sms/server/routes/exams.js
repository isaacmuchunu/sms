const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes are protected
router.use(authenticate);

// Main CRUD routes
router
  .route('/')
  .get(examController.getExams)
  .post(authorize('admin', 'teacher'), examController.createExam);

router
  .route('/:id')
  .get(examController.getExam)
  .put(authorize('admin'), examController.updateExam)
  .delete(authorize('admin'), examController.deleteExam);

// Publish results
router.post('/:id/publish', authorize('admin'), examController.publishResults);
router.patch('/:id/publish', authorize('admin'), examController.publishResults);

// Marks routes
router.post(
  '/:examId/subjects/:subjectId/marks',
  authorize('admin', 'teacher'),
  examController.addMarks
);
router.get(
  '/:examId/subjects/:subjectId/marks',
  authorize('admin', 'teacher'),
  examController.getMarks
);

// Result routes
router.get(
  '/:examId/students/:studentId/result',
  authorize('admin', 'teacher'),
  examController.getResult
);
router.get(
  '/:examId/class/:classId/results',
  authorize('admin', 'teacher'),
  examController.getClassResult
);

module.exports = router;
