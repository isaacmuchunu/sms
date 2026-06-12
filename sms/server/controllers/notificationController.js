const Notification = require('../models/Notification');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// @desc    Get notifications for current user
// @route   GET /api/v1/notifications
// @access  Private
exports.getNotifications = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;

  const currentUser = req.user;

  // Build query: notifications where targetRoles includes user's role
  // OR recipient-specific notifications for this user
  const query = {
    $or: [
      { targetRoles: { $in: [currentUser.role] } },
      { recipients: { $elemMatch: { user: currentUser.id } } },
    ],
    status: 'active',
  };

  // Filter by read/unread status for this user
  let notificationsQuery = Notification.find(query)
    .populate('sentBy', 'name email role')
    .sort('-createdAt');

  const skip = (Number(page) - 1) * Number(limit);

  const [notifications, total] = await Promise.all([
    notificationsQuery.skip(skip).limit(Number(limit)).lean(),
    Notification.countDocuments(query),
  ]);

  // Enrich notifications with read status for current user
  const enrichedNotifications = notifications.map((n) => {
    const recipientEntry = n.recipients?.find(
      (r) => r.user?.toString() === currentUser.id
    );
    const readStatus = recipientEntry?.read || false;
    const readAt = recipientEntry?.readAt || null;

    return {
      ...n,
      isRead: readStatus,
      readAt,
    };
  });

  // Filter by read status if requested
  let filteredNotifications = enrichedNotifications;
  if (status === 'read') {
    filteredNotifications = enrichedNotifications.filter((n) => n.isRead);
  } else if (status === 'unread') {
    filteredNotifications = enrichedNotifications.filter((n) => !n.isRead);
  }

  const meta = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return ApiResponse.success(
    res,
    { notifications: filteredNotifications, meta },
    'Notifications retrieved'
  );
});

// @desc    Create notification/announcement
// @route   POST /api/v1/notifications
// @access  Admin, Teacher
exports.createNotification = catchAsync(async (req, res) => {
  const {
    title,
    message,
    type,
    targetRoles,
    targetClasses,
    priority,
    expiresAt,
  } = req.body;

  if (!title || !message) {
    throw new ApiError('Title and message are required', 400);
  }

  // Build recipients list from target roles
  const recipients = [];
  if (targetRoles && targetRoles.length > 0) {
    const users = await User.find({
      role: { $in: targetRoles },
      status: 'active',
    }).select('_id');

    users.forEach((user) => {
      recipients.push({ user: user._id, read: false });
    });
  }

  const notification = await Notification.create({
    title,
    message,
    type: type || 'announcement',
    targetRoles: targetRoles || [],
    targetClasses: targetClasses || [],
    priority: priority || 'normal',
    sentBy: req.user.id,
    recipients,
    status: 'active',
    expiresAt,
  });

  const populatedNotification = await Notification.findById(notification._id)
    .populate('sentBy', 'name email role');

  return ApiResponse.success(
    res,
    { notification: populatedNotification },
    'Notification created successfully',
    201
  );
});

// @desc    Mark notification as read
// @route   PUT /api/v1/notifications/:id/read
// @access  Private
exports.markAsRead = catchAsync(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) {
    throw new ApiError('Notification not found', 404);
  }

  // Check if user is in recipients
  const recipientEntry = notification.recipients.find(
    (r) => r.user?.toString() === req.user.id
  );

  if (recipientEntry) {
    recipientEntry.read = true;
    recipientEntry.readAt = new Date();
  } else {
    // Add user to recipients as read
    notification.recipients.push({
      user: req.user.id,
      read: true,
      readAt: new Date(),
    });
  }

  await notification.save();

  return ApiResponse.success(res, null, 'Notification marked as read');
});

// @desc    Mark all notifications as read for current user
// @route   PUT /api/v1/notifications/read-all
// @access  Private
exports.markAllAsRead = catchAsync(async (req, res) => {
  const userId = req.user.id;

  // Find all unread notifications for this user
  const notifications = await Notification.find({
    $or: [
      { targetRoles: { $in: [req.user.role] } },
      { 'recipients.user': userId },
    ],
    status: 'active',
  });

  let updatedCount = 0;

  for (const notification of notifications) {
    const recipientEntry = notification.recipients.find(
      (r) => r.user?.toString() === userId
    );

    if (recipientEntry && !recipientEntry.read) {
      recipientEntry.read = true;
      recipientEntry.readAt = new Date();
      updatedCount++;
    } else if (!recipientEntry) {
      notification.recipients.push({
        user: userId,
        read: true,
        readAt: new Date(),
      });
      updatedCount++;
    }

    await notification.save();
  }

  return ApiResponse.success(
    res,
    { updatedCount },
    `${updatedCount} notifications marked as read`
  );
});

// @desc    Delete notification (soft delete for recipient)
// @route   DELETE /api/v1/notifications/:id
// @access  Private
exports.deleteNotification = catchAsync(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) {
    throw new ApiError('Notification not found', 404);
  }

  // Soft delete for this recipient only
  const recipientEntry = notification.recipients.find(
    (r) => r.user?.toString() === req.user.id
  );

  if (recipientEntry) {
    recipientEntry.deleted = true;
    recipientEntry.deletedAt = new Date();
  } else {
    notification.recipients.push({
      user: req.user.id,
      deleted: true,
      deletedAt: new Date(),
    });
  }

  await notification.save();

  return ApiResponse.success(res, null, 'Notification deleted');
});

// @desc    Get unread notification count for current user
// @route   GET /api/v1/notifications/unread-count
// @access  Private
exports.getUnreadCount = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  const notifications = await Notification.find({
    $or: [
      { targetRoles: { $in: [userRole] } },
      { 'recipients.user': userId },
    ],
    status: 'active',
  }).lean();

  let unreadCount = 0;

  notifications.forEach((n) => {
    const recipientEntry = n.recipients?.find(
      (r) => r.user?.toString() === userId
    );

    if (!recipientEntry || !recipientEntry.read) {
      unreadCount++;
    }
  });

  return ApiResponse.success(res, { unreadCount }, 'Unread count retrieved');
});
