const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const classSubjectController = require('../controllers/classSubjectController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  classQuerySchema,
  classBodySchema,
  classUpdateSchema,
  sectionBodySchema,
  sectionUpdateSchema,
  classSubjectBodySchema,
  classSubjectUpdateSchema,
  classSubjectQuerySchema,
  classTimetableQuerySchema,
  objectIdParamSchema,
  classSectionParamsSchema,
  classAllocationParamsSchema,
} = require('../validators/academics');

router.use(authenticate);

// ---------- Classes ----------
router
  .route('/')
  .get(authorize('admin', 'principal', 'teacher', 'student', 'parent'), validate(classQuerySchema, 'query'), classController.getClasses)
  .post(authorize('admin', 'principal'), validate(classBodySchema, 'body'), classController.createClass);

router
  .route('/:id')
  .get(authorize('admin', 'principal', 'teacher', 'student', 'parent'), validate(objectIdParamSchema, 'params'), classController.getClass)
  .put(authorize('admin', 'principal'), validate(objectIdParamSchema, 'params'), validate(classUpdateSchema, 'body'), classController.updateClass)
  .delete(authorize('admin'), validate(objectIdParamSchema, 'params'), classController.deleteClass);

// ---------- Sections ----------
router
  .route('/:id/sections')
  .get(authorize('admin', 'principal', 'teacher', 'student', 'parent'), validate(objectIdParamSchema, 'params'), classController.getSections)
  .post(authorize('admin', 'principal'), validate(objectIdParamSchema, 'params'), validate(sectionBodySchema, 'body'), classController.addSection);

router
  .route('/:id/sections/:sectionId')
  .get(authorize('admin', 'principal', 'teacher', 'student', 'parent'), validate(classSectionParamsSchema, 'params'), classController.getSection)
  .put(authorize('admin', 'principal'), validate(classSectionParamsSchema, 'params'), validate(sectionUpdateSchema, 'body'), classController.updateSection)
  .delete(authorize('admin'), validate(classSectionParamsSchema, 'params'), classController.deleteSection);

// ---------- Class timetable view ----------
router.get(
  '/:id/timetable',
  authorize('admin', 'principal', 'teacher', 'student', 'parent'),
  validate(objectIdParamSchema, 'params'),
  validate(classTimetableQuerySchema, 'query'),
  classController.getClassTimetable
);

// ---------- Class-subject allocations nested under class ----------
router
  .route('/:id/subjects')
  .get(authorize('admin', 'principal', 'teacher', 'student', 'parent'), validate(objectIdParamSchema, 'params'), validate(classSubjectQuerySchema, 'query'), classSubjectController.getByClass)
  .post(
    authorize('admin', 'principal', 'teacher'),
    validate(objectIdParamSchema, 'params'),
    validate(classSubjectBodySchema, 'body'),
    classSubjectController.createClassSubject
  );

router
  .route('/:id/subjects/:allocationId')
  .get(authorize('admin', 'principal', 'teacher', 'student', 'parent'), validate(classAllocationParamsSchema, 'params'), classSubjectController.getClassSubject)
  .put(
    authorize('admin', 'principal', 'teacher'),
    validate(classAllocationParamsSchema, 'params'),
    validate(classSubjectUpdateSchema, 'body'),
    classSubjectController.updateClassSubject
  )
  .delete(authorize('admin', 'principal'), validate(classAllocationParamsSchema, 'params'), classSubjectController.deleteClassSubject);

module.exports = router;
