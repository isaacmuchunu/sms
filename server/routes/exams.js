const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const examScheduleController = require('../controllers/examScheduleController');
const markController = require('../controllers/markController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const examValidator = require('../validators/exams');

// All routes are protected
router.use(authenticate);

// ── Exam CRUD ──────────────────────────────────────────────
router
  .route('/')
  .get(
    authorize('admin', 'principal', 'teacher'),
    validate(examValidator.listExamsQuerySchema, 'query'),
    examController.getExams
  )
  .post(
    authorize('admin', 'principal'),
    validate(examValidator.examCreateSchema),
    examController.createExam
  );

router
  .route('/:id')
  .get(
    authorize('admin', 'principal', 'teacher'),
    validate(examValidator.objectIdParamSchema, 'params'),
    examController.getExam
  )
  .put(
    authorize('admin', 'principal'),
    validate(examValidator.objectIdParamSchema, 'params'),
    validate(examValidator.examUpdateSchema),
    examController.updateExam
  )
  .delete(
    authorize('admin'),
    validate(examValidator.objectIdParamSchema, 'params'),
    examController.deleteExam
  );

// ── Publish results ─────────────────────────────────────────
router.post(
  '/:id/publish',
  authorize('admin', 'principal'),
  validate(examValidator.objectIdParamSchema, 'params'),
  examController.publishResults
);

// ── Exam Schedules ──────────────────────────────────────────
router
  .route('/:examId/schedules')
  .get(
    authorize('admin', 'principal', 'teacher'),
    validate(examValidator.examParamsSchema, 'params'),
    validate(examValidator.listSchedulesQuerySchema, 'query'),
    examScheduleController.getSchedules
  )
  .post(
    authorize('admin', 'principal'),
    validate(examValidator.examParamsSchema, 'params'),
    validate(examValidator.scheduleCreateSchema),
    examScheduleController.createSchedule
  );

router
  .route('/:examId/schedules/:scheduleId')
  .get(
    authorize('admin', 'principal', 'teacher'),
    validate(examValidator.examScheduleParamsSchema, 'params'),
    examScheduleController.getSchedule
  )
  .put(
    authorize('admin', 'principal'),
    validate(examValidator.examScheduleParamsSchema, 'params'),
    validate(examValidator.scheduleUpdateSchema),
    examScheduleController.updateSchedule
  )
  .delete(
    authorize('admin', 'principal'),
    validate(examValidator.examScheduleParamsSchema, 'params'),
    examScheduleController.deleteSchedule
  );

// ── Marks Entry ─────────────────────────────────────────────
router
  .route('/:examId/schedules/:scheduleId/marks')
  .get(
    authorize('admin', 'principal', 'teacher'),
    validate(examValidator.examScheduleParamsSchema, 'params'),
    validate(examValidator.listMarksQuerySchema, 'query'),
    markController.getMarksBySchedule
  )
  .post(
    authorize('admin', 'principal', 'teacher'),
    validate(examValidator.examScheduleParamsSchema, 'params'),
    validate(examValidator.marksEntrySchema),
    markController.bulkSaveMarks
  );

router.post(
  '/:examId/schedules/:scheduleId/submit',
  authorize('admin', 'principal', 'teacher'),
  validate(examValidator.examScheduleParamsSchema, 'params'),
  markController.submitMarks
);

router.post(
  '/:examId/schedules/:scheduleId/verify',
  authorize('admin', 'principal'),
  validate(examValidator.examScheduleParamsSchema, 'params'),
  markController.verifyMarks
);

// ── Results ─────────────────────────────────────────────────
router.get(
  '/:examId/students/:studentId/result',
  authorize('admin', 'principal', 'teacher'),
  validate(examValidator.examStudentParamsSchema, 'params'),
  markController.getStudentResult
);

router.get(
  '/:examId/class/:classId/results',
  authorize('admin', 'principal', 'teacher'),
  validate(examValidator.examClassParamsSchema, 'params'),
  markController.getClassResults
);

module.exports = router;
