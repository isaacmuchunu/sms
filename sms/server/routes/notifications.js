const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes are protected
router.use(authenticate);

// Get notifications for current user
router.get('/', notificationController.getNotifications);

// Create notification (admin and teacher only)
router.post('/', authorize('admin', 'teacher'), notificationController.createNotification);

// Mark as read
router.put('/:id/read', notificationController.markAsRead);

// Mark all as read
router.put('/read-all', notificationController.markAllAsRead);

// Delete notification (soft delete)
router.delete('/:id', notificationController.deleteNotification);

// Get unread count
router.get('/unread-count', notificationController.getUnreadCount);

module.exports = router;
