const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  timetableEntryBodySchema,
  timetableEntryUpdateSchema,
  timetableQuerySchema,
  classTimetableQuerySchema,
  teacherTimetableQuerySchema,
  generateTimetableSchema,
  objectIdParamSchema,
  classIdParamSchema,
  teacherIdParamSchema,
} = require('../validators/academics');

router.use(authenticate);

router
  .route('/')
  .get(authorize('admin', 'principal', 'teacher', 'student', 'parent'), validate(timetableQuerySchema, 'query'), timetableController.getTimetableEntries)
  .post(authorize('admin', 'principal', 'teacher'), validate(timetableEntryBodySchema, 'body'), timetableController.createTimetableEntry);

// One-segment special routes must come before /:id
router.get(
  '/conflicts',
  authorize('admin', 'principal', 'teacher'),
  validate(timetableQuerySchema, 'query'),
  timetableController.getConflicts
);

router.post(
  '/generate',
  authorize('admin', 'principal'),
  validate(generateTimetableSchema, 'body'),
  timetableController.generateTimetable
);

router
  .route('/:id')
  .get(authorize('admin', 'principal', 'teacher', 'student', 'parent'), validate(objectIdParamSchema, 'params'), timetableController.getTimetableEntry)
  .put(authorize('admin', 'principal', 'teacher'), validate(objectIdParamSchema, 'params'), validate(timetableEntryUpdateSchema, 'body'), timetableController.updateTimetableEntry)
  .delete(authorize('admin', 'principal', 'teacher'), validate(objectIdParamSchema, 'params'), timetableController.deleteTimetableEntry);

// Views
router.get(
  '/class/:classId',
  authorize('admin', 'principal', 'teacher', 'student', 'parent'),
  validate(classIdParamSchema, 'params'),
  validate(classTimetableQuerySchema, 'query'),
  timetableController.getClassTimetable
);

router.get(
  '/teacher/:teacherId',
  authorize('admin', 'principal', 'teacher', 'student', 'parent'),
  validate(teacherIdParamSchema, 'params'),
  validate(teacherTimetableQuerySchema, 'query'),
  timetableController.getTeacherTimetable
);

router.get(
  '/conflicts',
  authorize('admin', 'principal', 'teacher'),
  validate(timetableQuerySchema, 'query'),
  timetableController.getConflicts
);

router.post(
  '/generate',
  authorize('admin', 'principal'),
  validate(generateTimetableSchema, 'body'),
  timetableController.generateTimetable
);

module.exports = router;
