const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  teacherIdParamSchema,
  createTeacherSchema,
  updateTeacherSchema,
  listTeachersQuerySchema,
  assignSubjectSchema,
  assignClassSchema,
  academicYearQuerySchema,
} = require('../validators/teachers');

// All routes require authentication
router.use(authenticate);

// List / create teachers
router
  .route('/')
  .get(
    authorize('admin', 'principal', 'teacher'),
    validate(listTeachersQuerySchema, 'query'),
    teacherController.getTeachers
  )
  .post(
    authorize('admin'),
    validate(createTeacherSchema),
    teacherController.createTeacher
  );

// Assignment matrix (must come before /:id routes)
router.get(
  '/assignment-matrix',
  authorize('admin', 'principal', 'teacher'),
  validate(academicYearQuerySchema, 'query'),
  teacherController.getAssignmentMatrix
);

// Single teacher CRUD
router
  .route('/:id')
  .get(
    authorize('admin', 'principal', 'teacher'),
    validate(teacherIdParamSchema, 'params'),
    teacherController.getTeacher
  )
  .put(
    authorize('admin'),
    validate(teacherIdParamSchema, 'params'),
    validate(updateTeacherSchema),
    teacherController.updateTeacher
  )
  .delete(
    authorize('admin'),
    validate(teacherIdParamSchema, 'params'),
    teacherController.deleteTeacher
  );

// Subject assignment routes
router.post(
  '/:id/assign-subject',
  authorize('admin'),
  validate(teacherIdParamSchema, 'params'),
  validate(assignSubjectSchema),
  teacherController.assignSubject
);

router.delete(
  '/:id/remove-subject',
  authorize('admin'),
  validate(teacherIdParamSchema, 'params'),
  validate(assignSubjectSchema),
  teacherController.removeSubject
);

// Class teacher assignment routes
router.post(
  '/:id/assign-class',
  authorize('admin'),
  validate(teacherIdParamSchema, 'params'),
  validate(assignClassSchema),
  teacherController.assignClass
);

router.delete(
  '/:id/class',
  authorize('admin'),
  validate(teacherIdParamSchema, 'params'),
  teacherController.removeClass
);

// Teacher sub-resources
router.get(
  '/:id/classes',
  authorize('admin', 'principal', 'teacher'),
  validate(teacherIdParamSchema, 'params'),
  teacherController.getClasses
);

router.get(
  '/:id/timetable',
  authorize('admin', 'principal', 'teacher'),
  validate(teacherIdParamSchema, 'params'),
  validate(academicYearQuerySchema, 'query'),
  teacherController.getTimetable
);

router.get(
  '/:id/workload',
  authorize('admin', 'principal', 'teacher'),
  validate(teacherIdParamSchema, 'params'),
  validate(academicYearQuerySchema, 'query'),
  teacherController.getWorkload
);

module.exports = router;
