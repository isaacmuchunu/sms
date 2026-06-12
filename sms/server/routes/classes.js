const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes are protected
router.use(authenticate);

// Main CRUD routes
router
  .route('/')
  .get(classController.getClasses)
  .post(authorize('admin'), classController.createClass);

router
  .route('/:id')
  .get(classController.getClass)
  .put(authorize('admin'), classController.updateClass)
  .delete(authorize('admin'), classController.deleteClass);

// Student management routes
router.post('/:id/add-student', authorize('admin'), classController.addStudent);
router.post('/:id/remove-student', authorize('admin'), classController.removeStudent);

// Timetable routes
router
  .route('/:id/timetable')
  .get(classController.getTimetable)
  .put(authorize('admin'), classController.updateTimetable);

module.exports = router;
