const db = require('../db');

const VALID_NOTIFICATION_TYPES = new Set([
  'announcement',
  'fee',
  'attendance',
  'exam',
  'general',
  'alert',
]);

const safeJsonParse = (str, fallback) => {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

/**
 * Check whether a user has in-app notifications enabled.
 * Defaults to true unless preferences.notifications.inApp === false.
 */
const isInAppEnabled = (user) => {
  if (!user || !user.preferences) return true;
  const prefs = typeof user.preferences === 'string'
    ? safeJsonParse(user.preferences, {})
    : user.preferences;
  return prefs.notifications?.inApp !== false;
};

const sanitizeType = (type) => {
  if (!type) return 'general';
  return VALID_NOTIFICATION_TYPES.has(type) ? type : 'general';
};

/**
 * Create a single in-app notification.
 */
const createNotification = async ({
  recipientId,
  senderId,
  title,
  message,
  type = 'general',
  referenceModel = '',
  referenceId = null,
}) => {
  if (!recipientId) {
    throw new Error('recipientId is required');
  }

  const user = await db.findOne('users', { id: recipientId });
  if (!user || user.status !== 'active') {
    throw new Error(`Recipient ${recipientId} is not an active user`);
  }

  if (!isInAppEnabled(user)) {
    return null;
  }

  return db.insert('notifications', {
    recipient_id: recipientId,
    sender_id: senderId || null,
    title,
    message,
    type: sanitizeType(type),
    reference_model: referenceModel || '',
    reference_id: referenceId || null,
  });
};

/**
 * Create bulk in-app notifications for many recipients.
 * Validates that recipients exist, are active, and have not disabled in-app notifications.
 */
const createBulkNotifications = async ({
  recipientIds,
  senderId,
  title,
  message,
  type = 'general',
  referenceModel = '',
  referenceId = null,
}) => {
  if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
    return { createdCount: 0, skipped: [] };
  }

  const placeholders = recipientIds.map((_, i) => `$${i + 1}`).join(', ');
  const users = await db.raw(
    `SELECT id, status, preferences FROM users WHERE id IN (${placeholders})`,
    recipientIds
  );

  const validRecipients = users.filter((u) => u.status === 'active' && isInAppEnabled(u));
  const validIds = validRecipients.map((u) => u.id);
  const skipped = recipientIds.filter((id) => !validIds.includes(id));

  if (validIds.length === 0) {
    return { createdCount: 0, skipped };
  }

  const sanitizedType = sanitizeType(type);
  const columns = [
    'recipient_id',
    'sender_id',
    'title',
    'message',
    'type',
    'reference_model',
    'reference_id',
  ];

  const valueRows = [];
  const values = [];
  let paramIdx = 1;

  for (const recipientId of validIds) {
    const rowPlaceholders = columns.map(() => `$${paramIdx++}`).join(', ');
    valueRows.push(`(${rowPlaceholders})`);
    values.push(
      recipientId,
      senderId || null,
      title,
      message,
      sanitizedType,
      referenceModel || '',
      referenceId || null
    );
  }

  const inserted = await db.raw(
    `INSERT INTO notifications (${columns.map((c) => `"${c}"`).join(', ')})
     VALUES ${valueRows.join(', ')}
     RETURNING *`,
    values
  );

  return { createdCount: inserted.length, skipped };
};

/**
 * Mark a single notification as read, verifying ownership.
 */
const markAsRead = async (notificationId, recipientId) => {
  const rows = await db.raw(
    `UPDATE notifications
     SET is_read = true, read_at = NOW()
     WHERE id = $1 AND recipient_id = $2
     RETURNING *`,
    [notificationId, recipientId]
  );
  return rows[0] || null;
};

/**
 * Mark all unread notifications as read for a user.
 */
const markAllAsRead = async (recipientId) => {
  const result = await db.raw(
    `UPDATE notifications
     SET is_read = true, read_at = NOW()
     WHERE recipient_id = $1 AND is_read = false
     RETURNING id`,
    [recipientId]
  );
  return { updatedCount: result.length };
};

/**
 * Get unread notification count for a user.
 */
const getUnreadCount = async (userId) => {
  const rows = await db.raw(
    `SELECT COUNT(*) AS count FROM notifications WHERE recipient_id = $1 AND is_read = false`,
    [userId]
  );
  return parseInt(rows[0].count, 10);
};

/**
 * Get recent notifications for a user.
 */
const getRecentNotifications = async (userId, limit = 10) => {
  return db.raw(
    `SELECT * FROM notifications
     WHERE recipient_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
};

// ── Helper queries for common notification targets ──

/**
 * Get active user IDs for an announcement target audience, scoped to a school.
 */
const getAnnouncementRecipientIds = async (targetAudience, schoolId) => {
  let roleFilter = '';

  if (targetAudience === 'students') {
    roleFilter = `AND role = 'student'`;
  } else if (targetAudience === 'teachers') {
    roleFilter = `AND role = 'teacher'`;
  } else if (targetAudience === 'parents') {
    roleFilter = `AND role = 'parent'`;
  } else if (targetAudience === 'staff') {
    roleFilter = `AND role = 'staff'`;
  }

  const rows = await db.raw(
    `SELECT id FROM users WHERE status = 'active' AND school_id = $1 ${roleFilter}`,
    [schoolId]
  );
  return rows.map((r) => r.id);
};

/**
 * Get active user IDs for a student and their linked guardians.
 */
const getStudentAndGuardianUserIds = async (studentId) => {
  const studentRows = await db.raw(
    `SELECT user_id FROM students WHERE id = $1 AND status = 'active'`,
    [studentId]
  );

  const guardianRows = await db.raw(
    `SELECT g.user_id
     FROM guardians g
     JOIN student_guardians sg ON sg.guardian_id = g.id
     WHERE sg.student_id = $1`,
    [studentId]
  );

  const ids = [];
  if (studentRows[0]?.user_id) ids.push(studentRows[0].user_id);
  for (const g of guardianRows) {
    if (g.user_id) ids.push(g.user_id);
  }

  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return [];

  const placeholders = uniqueIds.map((_, i) => `$${i + 1}`).join(', ');
  const activeUsers = await db.raw(
    `SELECT id FROM users WHERE id IN (${placeholders}) AND status = 'active'`,
    uniqueIds
  );

  return activeUsers.map((u) => u.id);
};

module.exports = {
  createNotification,
  createBulkNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  getRecentNotifications,
  getAnnouncementRecipientIds,
  getStudentAndGuardianUserIds,
};
