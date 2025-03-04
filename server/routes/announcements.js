const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  announcementIdParam,
  createAnnouncement,
  updateAnnouncement,
  listAnnouncementsQuery,
} = require('../validators/communications');

// All routes are protected
router.use(authenticate);

// Main CRUD routes
router
  .route('/')
  .get(validate(listAnnouncementsQuery, 'query'), announcementController.getAnnouncements)
  .post(
    authorize('admin', 'teacher'),
    validate(createAnnouncement),
    announcementController.createAnnouncement
  );

router
  .route('/:id')
  .get(validate(announcementIdParam, 'params'), announcementController.getAnnouncement)
  .put(
    authorize('admin', 'teacher'),
    validate(announcementIdParam, 'params'),
    validate(updateAnnouncement),
    announcementController.updateAnnouncement
  )
  .delete(
    authorize('admin', 'teacher'),
    validate(announcementIdParam, 'params'),
    announcementController.deleteAnnouncement
  );

// Publish toggle
router.patch(
  '/:id/publish',
  authorize('admin', 'teacher'),
  validate(announcementIdParam, 'params'),
  announcementController.togglePublish
);

module.exports = router;
