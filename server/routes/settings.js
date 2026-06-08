const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  schoolUpdateSchema,
  academicYearBodySchema,
  academicYearUpdateSchema,
  objectIdParamSchema,
  gradingScaleUpdateSchema,
  notificationSettingsSchema,
} = require('../validators/settings');

router.use(authenticate);

// ---------- School ----------
router
  .route('/school')
  .get(authorize('admin', 'principal', 'teacher', 'staff', 'super_admin'), settingsController.getSchool)
  .put(authorize('admin', 'principal', 'super_admin'), validate(schoolUpdateSchema, 'body'), settingsController.updateSchool);

// ---------- Academic Years ----------
router
  .route('/academic-years')
  .get(authorize('admin', 'principal', 'teacher', 'staff', 'super_admin'), settingsController.getAcademicYears)
  .post(authorize('admin', 'principal', 'super_admin'), validate(academicYearBodySchema, 'body'), settingsController.createAcademicYear);

router
  .route('/academic-years/:id')
  .put(
    authorize('admin', 'principal', 'super_admin'),
    validate(objectIdParamSchema, 'params'),
    validate(academicYearUpdateSchema, 'body'),
    settingsController.updateAcademicYear
  )
  .delete(authorize('admin', 'principal', 'super_admin'), validate(objectIdParamSchema, 'params'), settingsController.deleteAcademicYear);

router.patch(
  '/academic-years/:id/set-current',
  authorize('admin', 'principal', 'super_admin'),
  validate(objectIdParamSchema, 'params'),
  settingsController.setCurrentAcademicYear
);

// ---------- Grading Scale ----------
router
  .route('/grading-scale')
  .get(authorize('admin', 'principal', 'teacher', 'staff', 'super_admin'), settingsController.getGradingScale)
  .put(authorize('admin', 'principal', 'super_admin'), validate(gradingScaleUpdateSchema, 'body'), settingsController.updateGradingScale);

// ---------- Notifications ----------
router
  .route('/notifications')
  .get(authorize('admin', 'principal', 'teacher', 'staff', 'super_admin'), settingsController.getNotificationSettings)
  .put(authorize('admin', 'principal', 'teacher', 'staff', 'super_admin'), validate(notificationSettingsSchema, 'body'), settingsController.updateNotificationSettings);

module.exports = router;
