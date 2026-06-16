const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  subjectQuerySchema,
  subjectBodySchema,
  subjectUpdateSchema,
  allocateSubjectSchema,
  objectIdParamSchema,
} = require('../validators/academics');

router.use(authenticate);

router
  .route('/')
  .get(authorize('admin', 'principal', 'teacher', 'student', 'parent'), validate(subjectQuerySchema, 'query'), subjectController.getSubjects)
  .post(authorize('admin', 'principal'), validate(subjectBodySchema, 'body'), subjectController.createSubject);

router
  .route('/:id')
  .get(authorize('admin', 'principal', 'teacher', 'student', 'parent'), validate(objectIdParamSchema, 'params'), subjectController.getSubject)
  .put(authorize('admin', 'principal'), validate(objectIdParamSchema, 'params'), validate(subjectUpdateSchema, 'body'), subjectController.updateSubject)
  .delete(authorize('admin'), validate(objectIdParamSchema, 'params'), subjectController.deleteSubject);

// Convenience endpoint to allocate this subject to a class-section
router.post(
  '/:id/allocate',
  authorize('admin', 'principal', 'teacher'),
  validate(objectIdParamSchema, 'params'),
  validate(allocateSubjectSchema, 'body'),
  subjectController.allocateToClass
);

module.exports = router;
