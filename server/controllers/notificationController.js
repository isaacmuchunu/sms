const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { scopeBySchool } = require('../middleware/auth');
const { buildOrderBy } = require('../utils/sort');

const NOTIFICATION_SORT_ALLOWLIST = {
  title: 'n.title',
  type: 'n.type',
  isRead: 'n.is_read',
  readAt: 'n.read_at',
  createdAt: 'n.created_at',
  updatedAt: 'n.updated_at',
};

/**
 * Transform a raw notifications row (with optional joined recipient/sender JSON)
 * into the camelCase response shape previously returned by Mongoose.
 */
const toNotificationResponse = (row, opts = {}) => {
  const result = {
    id: row.id,
    recipient: row.recipient_id,
    sender: row.sender_id,
    title: row.title,
    message: row.message,
    type: row.type,
    referenceModel: row.reference_model,
    referenceId: row.reference_id,
    isRead: row.is_read,
    readAt: row.read_at,
    isPushSent: row.is_push_sent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (opts.populateSender && row.sender && typeof row.sender === 'object') {
    result.sender = row.sender;
  }
  if (opts.populateRecipient && row.recipient && typeof row.recipient === 'object') {
    result.recipient = row.recipient;
  }

  return result;
};

const SENDER_JSON = `
  json_build_object(
    'id', s.id,
    'name', s.name,
    'email', s.email,
    'role', s.role
  ) AS sender
`;

const RECIPIENT_JSON = `
  json_build_object(
    'id', r.id,
    'name', r.name,
    'email', r.email,
    'role', r.role
  ) AS recipient
`;

// @desc    Get notifications for current user
// @route   GET /api/v1/notifications
// @access  Private
exports.getNotifications = catchAsync(async (req, res) => {
  const { type, isRead, search, sort } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const conditions = ['n.recipient_id = $1'];
  const values = [req.user.id];
  let paramIdx = 2;

  const schoolScope = scopeBySchool(req, values.length);
  if (schoolScope.clause !== '1=1') {
    conditions.push(`n.${schoolScope.clause}`);
  }
  values.push(...schoolScope.params);
  paramIdx = schoolScope.nextIndex;

  if (type) {
    conditions.push(`n.type = $${paramIdx++}`);
    values.push(type);
  }

  if (isRead !== undefined) {
    conditions.push(`n.is_read = $${paramIdx++}`);
    values.push(isRead === 'true' || isRead === true);
  }

  if (search) {
    conditions.push(`(n.title ILIKE $${paramIdx} OR n.message ILIKE $${paramIdx})`);
    values.push(`%${search}%`);
    paramIdx += 1;
  }

  const whereClause = conditions.join(' AND ');
  const orderBy = buildOrderBy(sort, undefined, NOTIFICATION_SORT_ALLOWLIST, 'n.created_at DESC');

  const [notificationRows, countRow] = await Promise.all([
    db.raw(
      `SELECT n.*, ${SENDER_JSON}
       FROM notifications n
       LEFT JOIN users s ON n.sender_id = s.id
       WHERE ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...values, limit, skip]
    ),
    db.raw(
      `SELECT COUNT(*) AS count
       FROM notifications n
       WHERE ${whereClause}`,
      values
    ),
  ]);

  const notifications = notificationRows.map((row) =>
    toNotificationResponse(row, { populateSender: true })
  );
  const total = parseInt(countRow[0].count, 10);
  const meta = getPaginationMeta(page, limit, total);

  return ApiResponse.paginated(res, notifications, meta, 'Notifications retrieved successfully');
});

// @desc    Get single notification
// @route   GET /api/v1/notifications/:id
// @access  Private
exports.getNotification = catchAsync(async (req, res) => {
  const params = [req.params.id, req.user.id];
  const schoolScope = scopeBySchool(req, params.length);

  let schoolClause = '';
  if (schoolScope.clause !== '1=1') {
    schoolClause = ` AND n.${schoolScope.clause}`;
    params.push(...schoolScope.params);
  }

  const rows = await db.raw(
    `SELECT n.*, ${SENDER_JSON}
     FROM notifications n
     LEFT JOIN users s ON n.sender_id = s.id
     WHERE n.id = $1 AND n.recipient_id = $2${schoolClause}
     LIMIT 1`,
    params
  );

  if (!rows || rows.length === 0) {
    throw new ApiError('Notification not found', 404);
  }

  const notification = toNotificationResponse(rows[0], { populateSender: true });

  return ApiResponse.success(res, { notification }, 'Notification retrieved successfully');
});

// @desc    Create notification(s)
// @route   POST /api/v1/notifications
// @access  Admin, Teacher
exports.createNotification = catchAsync(async (req, res) => {
  const { title, message, type, recipients, referenceModel, referenceId } = req.body;

  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new ApiError('No valid active recipients found', 400);
  }

  // Validate recipient existence within the same school
  const placeholders = recipients.map((_, i) => `$${i + 1}`).join(', ');
  const existingUsers = await db.raw(
    `SELECT id FROM users WHERE id IN (${placeholders}) AND status = 'active' AND school_id = $${recipients.length + 1}`,
    [...recipients, req.user.school_id]
  );
  const validRecipientIds = existingUsers.map((u) => u.id);

  if (validRecipientIds.length === 0) {
    throw new ApiError('No valid active recipients found', 400);
  }

  const invalidRecipients = recipients.filter((id) => !validRecipientIds.includes(id));

  // Bulk insert notifications
  const columns = [
    'recipient_id',
    'sender_id',
    'school_id',
    'title',
    'message',
    'type',
    'reference_model',
    'reference_id',
    'is_read',
  ];
  const valueRows = [];
  const insertValues = [];
  let paramIdx = 1;

  for (const recipientId of validRecipientIds) {
    const rowPlaceholders = [];
    for (let i = 0; i < columns.length; i += 1) {
      rowPlaceholders.push(`$${paramIdx++}`);
    }
    valueRows.push(`(${rowPlaceholders.join(', ')})`);
    insertValues.push(
      recipientId,
      req.user.id,
      req.user.school_id,
      title,
      message,
      type || 'general',
      referenceModel || '',
      referenceId || null,
      false
    );
  }

  const inserted = await db.raw(
    `INSERT INTO notifications (${columns.map((c) => `"${c}"`).join(', ')})
     VALUES ${valueRows.join(', ')}
     RETURNING *`,
    insertValues
  );

  const insertedIds = inserted.map((n) => n.id);
  const idPlaceholders = insertedIds.map((_, i) => `$${i + 1}`).join(', ');

  const createdRows = await db.raw(
    `SELECT n.*, ${RECIPIENT_JSON}, ${SENDER_JSON}
     FROM notifications n
     LEFT JOIN users r ON n.recipient_id = r.id
     LEFT JOIN users s ON n.sender_id = s.id
     WHERE n.id IN (${idPlaceholders})`,
    insertedIds
  );

  const createdNotifications = createdRows.map((row) =>
    toNotificationResponse(row, { populateSender: true, populateRecipient: true })
  );

  return ApiResponse.success(
    res,
    {
      notifications: createdNotifications,
      createdCount: createdNotifications.length,
      invalidRecipients: invalidRecipients.length > 0 ? invalidRecipients : undefined,
    },
    `${createdNotifications.length} notification(s) created successfully`,
    201
  );
});

// @desc    Mark notification as read
// @route   PUT /api/v1/notifications/:id/read
// @access  Private
exports.markAsRead = catchAsync(async (req, res) => {
  const params = [req.params.id, req.user.id];
  const schoolScope = scopeBySchool(req, params.length);

  let schoolClause = '';
  if (schoolScope.clause !== '1=1') {
    schoolClause = ` AND ${schoolScope.clause}`;
    params.push(...schoolScope.params);
  }

  const rows = await db.raw(
    `SELECT * FROM notifications WHERE id = $1 AND recipient_id = $2${schoolClause} LIMIT 1`,
    params
  );

  if (!rows || rows.length === 0) {
    throw new ApiError('Notification not found', 404);
  }

  const notification = rows[0];

  if (!notification.is_read) {
    await db.raw(
      `UPDATE notifications
       SET is_read = true, read_at = NOW()
       WHERE id = $1`,
      [notification.id]
    );
  }

  const updatedRows = await db.raw(
    `SELECT n.*, ${SENDER_JSON}
     FROM notifications n
     LEFT JOIN users s ON n.sender_id = s.id
     WHERE n.id = $1`,
    [notification.id]
  );

  const updatedNotification = toNotificationResponse(updatedRows[0], { populateSender: true });

  return ApiResponse.success(
    res,
    { notification: updatedNotification },
    'Notification marked as read'
  );
});

// @desc    Mark all notifications as read for current user
// @route   PUT /api/v1/notifications/read-all
// @access  Private
exports.markAllAsRead = catchAsync(async (req, res) => {
  const params = [req.user.id];
  const schoolScope = scopeBySchool(req, params.length);

  let schoolClause = '';
  if (schoolScope.clause !== '1=1') {
    schoolClause = ` AND ${schoolScope.clause}`;
    params.push(...schoolScope.params);
  }

  const result = await db.raw(
    `UPDATE notifications
     SET is_read = true, read_at = NOW()
     WHERE recipient_id = $1 AND is_read = false${schoolClause}
     RETURNING id`,
    params
  );

  return ApiResponse.success(
    res,
    { updatedCount: result.length },
    `${result.length} notification(s) marked as read`
  );
});

// @desc    Delete notification for current user
// @route   DELETE /api/v1/notifications/:id
// @access  Private
exports.deleteNotification = catchAsync(async (req, res) => {
  const where = {
    id: req.params.id,
    recipient_id: req.user.id,
  };

  if (req.user.role !== 'super_admin') {
    where.school_id = req.user.school_id;
  } else if (req.query.schoolId) {
    where.school_id = req.query.schoolId;
  }

  const deleted = await db.delete('notifications', where);

  if (!deleted || deleted.length === 0) {
    throw new ApiError('Notification not found', 404);
  }

  return ApiResponse.success(res, null, 'Notification deleted successfully');
});

// @desc    Get unread notification count for current user
// @route   GET /api/v1/notifications/unread-count
// @access  Private
exports.getUnreadCount = catchAsync(async (req, res) => {
  const params = [req.user.id];
  const schoolScope = scopeBySchool(req, params.length);

  let schoolClause = '';
  if (schoolScope.clause !== '1=1') {
    schoolClause = ` AND ${schoolScope.clause}`;
    params.push(...schoolScope.params);
  }

  const rows = await db.raw(
    `SELECT COUNT(*) AS count FROM notifications WHERE recipient_id = $1 AND is_read = false${schoolClause}`,
    params
  );

  const unreadCount = parseInt(rows[0].count, 10);

  return ApiResponse.success(res, { unreadCount }, 'Unread count retrieved successfully');
});
