const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes are protected
router.use(authenticate);

// Main CRUD routes
router
  .route('/')
  .get(subjectController.getSubjects)
  .post(authorize('admin'), subjectController.createSubject);

router
  .route('/:id')
  .get(subjectController.getSubject)
  .put(authorize('admin'), subjectController.updateSubject)
  .delete(authorize('admin'), subjectController.deleteSubject);

// Allocate subject to class
router.post('/:id/allocate', authorize('admin'), subjectController.allocateToClass);

module.exports = router;
