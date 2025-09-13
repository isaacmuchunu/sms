const express = require('express');
const router = express.Router();
const classSubjectController = require('../controllers/classSubjectController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  classSubjectQuerySchema,
  classSubjectBodySchema,
  classSubjectUpdateSchema,
  objectIdParamSchema,
} = require('../validators/academics');

router.use(authenticate);

router
  .route('/')
  .get(authorize('admin', 'principal', 'teacher', 'student', 'parent'), validate(classSubjectQuerySchema, 'query'), classSubjectController.getClassSubjects)
  .post(authorize('admin', 'principal', 'teacher'), validate(classSubjectBodySchema, 'body'), classSubjectController.createClassSubject);

router
  .route('/:id')
  .get(authorize('admin', 'principal', 'teacher', 'student', 'parent'), validate(objectIdParamSchema, 'params'), classSubjectController.getClassSubject)
  .put(authorize('admin', 'principal', 'teacher'), validate(objectIdParamSchema, 'params'), validate(classSubjectUpdateSchema, 'body'), classSubjectController.updateClassSubject)
  .delete(authorize('admin', 'principal'), validate(objectIdParamSchema, 'params'), classSubjectController.deleteClassSubject);

module.exports = router;
