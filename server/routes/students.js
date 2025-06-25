const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  studentCreateSchema,
  studentUpdateSchema,
  studentQuerySchema,
  studentSearchQuerySchema,
  studentByClassQuerySchema,
  studentSubResourceQuerySchema,
  studentResultsQuerySchema,
  objectIdParamSchema,
  classIdParamSchema,
  bulkImportSchema,
} = require('../validators/students');

// All routes require authentication
router.use(authenticate);

// Search (must be defined before :id routes)
router.get(
  '/search',
  authorize('admin', 'principal', 'teacher'),
  validate(studentSearchQuerySchema, 'query'),
  studentController.searchStudents
);

router.get(
  '/my-children',
  authorize('parent'),
  studentController.getMyChildren
);

// Bulk import students
router.post(
  '/bulk-import',
  authorize('admin'),
  validate(bulkImportSchema, 'body'),
  studentController.bulkImport
);

// Teacher provisional student registration (pending admin approval)
router.post(
  '/provisional',
  authorize('admin', 'teacher'),
  validate(studentCreateSchema, 'body'),
  studentController.createProvisionalStudent
);

// Admin approval/rejection of provisional registrations
router.patch(
  '/:id/approve',
  authorize('admin'),
  validate(objectIdParamSchema, 'params'),
  studentController.approveStudent
);

router.patch(
  '/:id/reject',
  authorize('admin'),
  validate(objectIdParamSchema, 'params'),
  studentController.rejectStudent
);

// Get students by class (must be defined before :id routes)
router.get(
  '/class/:classId',
  authorize('admin', 'principal', 'teacher'),
  validate(classIdParamSchema, 'params'),
  validate(studentByClassQuerySchema, 'query'),
  studentController.getStudentsByClass
);

// Main CRUD routes
router
  .route('/')
  .get(
    authorize('admin', 'principal', 'teacher'),
    validate(studentQuerySchema, 'query'),
    studentController.getStudents
  )
  .post(
    authorize('admin'),
    validate(studentCreateSchema, 'body'),
    studentController.createStudent
  );

router
  .route('/:id')
  .get(
    authorize('admin', 'principal', 'teacher', 'student', 'parent'),
    validate(objectIdParamSchema, 'params'),
    studentController.getStudent
  )
  .put(
    authorize('admin', 'teacher'),
    validate(objectIdParamSchema, 'params'),
    validate(studentUpdateSchema, 'body'),
    studentController.updateStudent
  )
  .delete(
    authorize('admin'),
    validate(objectIdParamSchema, 'params'),
    studentController.deleteStudent
  );

// Student-specific sub-routes
router.get(
  '/:id/attendance',
  authorize('admin', 'principal', 'teacher', 'student', 'parent'),
  validate(objectIdParamSchema, 'params'),
  validate(studentSubResourceQuerySchema, 'query'),
  studentController.getStudentAttendance
);

router.get(
  '/:id/fees',
  authorize('admin', 'accountant', 'student', 'parent'),
  validate(objectIdParamSchema, 'params'),
  validate(studentSubResourceQuerySchema, 'query'),
  studentController.getStudentFees
);

router.get(
  '/:id/results',
  authorize('admin', 'principal', 'teacher', 'student', 'parent'),
  validate(objectIdParamSchema, 'params'),
  validate(studentResultsQuerySchema, 'query'),
  studentController.getStudentResults
);

router.get(
  '/:id/report-card.pdf',
  authorize('admin', 'principal', 'teacher', 'student', 'parent'),
  validate(objectIdParamSchema, 'params'),
  studentController.downloadReportCard
);

module.exports = router;
