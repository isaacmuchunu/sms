const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  notificationIdParam,
  createNotification,
  listNotificationsQuery,
} = require('../validators/communications');

// All routes are protected
router.use(authenticate);

// Get notifications for current user
router.get(
  '/',
  validate(listNotificationsQuery, 'query'),
  notificationController.getNotifications
);

// Get unread count
router.get('/unread-count', notificationController.getUnreadCount);

// Mark all as read
router.put('/read-all', notificationController.markAllAsRead);

// Create notification (admin and teacher only)
router.post(
  '/',
  authorize('admin', 'teacher'),
  validate(createNotification),
  notificationController.createNotification
);

// Single notification routes
router
  .route('/:id')
  .get(validate(notificationIdParam, 'params'), notificationController.getNotification)
  .delete(validate(notificationIdParam, 'params'), notificationController.deleteNotification);

// Mark as read
router.put(
  '/:id/read',
  validate(notificationIdParam, 'params'),
  notificationController.markAsRead
);

module.exports = router;
