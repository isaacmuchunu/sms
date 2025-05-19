const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { distributeAnnouncement } = require('../services/communicationService');
const notificationService = require('../services/notificationService');
const { scopeBySchool } = require('../middleware/auth');
const { buildOrderBy } = require('../utils/sort');

const ANNOUNCEMENT_SORT_ALLOWLIST = {
  title: '"title"',
  category: '"category"',
  priority: '"priority"',
  targetAudience: '"target_audience"',
  publishDate: '"publish_date"',
  expiryDate: '"expiry_date"',
  isPublished: '"is_published"',
  createdAt: '"created_at"',
  updatedAt: '"updated_at"',
};

const ANNOUNCEMENT_FIELD_MAP = {
  title: 'title',
  content: 'content',
  category: 'category',
  priority: 'priority',
  targetAudience: 'target_audience',
  publishDate: 'publish_date',
  expiryDate: 'expiry_date',
  isPublished: 'is_published',
  attachmentUrl: 'attachment_url',
};

const parseBoolean = (value) => value === 'true' || value === true;

const notifyAnnouncementAudience = async (announcement, senderId, schoolId) => {
  try {
    const recipientIds = await notificationService.getAnnouncementRecipientIds(
      announcement.targetAudience,
      schoolId
    );
    if (recipientIds.length === 0) return;

    await notificationService.createBulkNotifications({
      recipientIds,
      senderId,
      title: `New announcement: ${announcement.title}`,
      message: announcement.content,
      type: 'announcement',
      referenceModel: 'announcements',
      referenceId: announcement.id,
    });
  } catch (err) {
    console.error('Failed to create announcement notifications:', err.message);
  }
};

/**
 * Map a raw PostgreSQL announcement row (snake_case) to the camelCase
 * response shape previously returned by Mongoose.
 */
const toCamelCaseAnnouncement = (row) => {
  if (!row) return null;

  const announcement = {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    priority: row.priority,
    targetAudience: row.target_audience,
    postedBy: row.posted_by_id,
    publishDate: row.publish_date,
    expiryDate: row.expiry_date,
    isPublished: row.is_published,
    attachmentUrl: row.attachment_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (row.posted_by_name !== undefined) {
    announcement.postedBy = {
      id: row.posted_by_id,
      name: row.posted_by_name,
      email: row.posted_by_email,
      role: row.posted_by_role,
    };
  }

  return announcement;
};

/**
 * Parse and sanitize the sort string.
 * Defaults to '-publishDate' if invalid fields are supplied.
 */
const buildSort = (sortValue) => buildOrderBy(sortValue, undefined, ANNOUNCEMENT_SORT_ALLOWLIST, '"publish_date" DESC');

const POPULATE_ANNOUNCEMENT_SQL = `
  SELECT
    a.*,
    u.name AS posted_by_name,
    u.email AS posted_by_email,
    u.role AS posted_by_role
  FROM announcements a
  LEFT JOIN users u ON a.posted_by_id = u.id
  WHERE a.id = $1
  LIMIT 1
`;

// @desc    Get all announcements
// @route   GET /api/v1/announcements
// @access  Private
exports.getAnnouncements = catchAsync(async (req, res) => {
  const { search, category, priority, targetAudience, isPublished, sort } = req.query;
  const { page, limit, skip } = getPagination(req.query);
  const isPrivileged = ['super_admin', 'admin', 'teacher'].includes(req.user.role);

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  const schoolScope = scopeBySchool(req, 0);
  if (schoolScope.clause !== '1=1') {
    conditions.push(`a.${schoolScope.clause}`);
  }
  params.push(...schoolScope.params);
  paramIdx = schoolScope.nextIndex;

  if (category) {
    conditions.push(`a.category = $${paramIdx++}`);
    params.push(category);
  }
  if (priority) {
    conditions.push(`a.priority = $${paramIdx++}`);
    params.push(priority);
  }
  if (targetAudience) {
    conditions.push(`a.target_audience = $${paramIdx++}`);
    params.push(targetAudience);
  }
  if (isPublished !== undefined) {
    conditions.push(`a.is_published = $${paramIdx++}`);
    params.push(parseBoolean(isPublished));
  }

  // For non-admin/non-teacher users, only show published, non-expired announcements
  if (!isPrivileged) {
    conditions.push(`a.is_published = $${paramIdx++}`);
    params.push(true);
    conditions.push(`(a.expiry_date IS NULL OR a.expiry_date >= CURRENT_TIMESTAMP)`);
  }

  if (search) {
    conditions.push(`(a.title ILIKE $${paramIdx++} OR a.content ILIKE $${paramIdx++})`);
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = buildSort(sort);

  const [announcementRows, countRows] = await Promise.all([
    db.raw(
      `
        SELECT
          a.*,
          u.name AS posted_by_name,
          u.email AS posted_by_email,
          u.role AS posted_by_role
        FROM announcements a
        LEFT JOIN users u ON a.posted_by_id = u.id
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `,
      [...params, limit, skip]
    ),
    db.raw(`SELECT COUNT(*) AS count FROM announcements a ${whereClause}`, params),
  ]);

  const total = parseInt(countRows[0].count, 10);
  const announcements = announcementRows.map(toCamelCaseAnnouncement);
  const meta = getPaginationMeta(page, limit, total);

  return ApiResponse.paginated(res, announcements, meta, 'Announcements retrieved successfully');
});

// @desc    Get single announcement
// @route   GET /api/v1/announcements/:id
// @access  Private
exports.getAnnouncement = catchAsync(async (req, res) => {
  const rows = await db.raw(POPULATE_ANNOUNCEMENT_SQL, [req.params.id]);
  const row = rows[0];

  if (!row) {
    throw new ApiError('Announcement not found', 404);
  }

  if (req.user.role !== 'super_admin' && row.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const announcement = toCamelCaseAnnouncement(row);

  const isPrivileged = ['super_admin', 'admin', 'teacher'].includes(req.user.role);
  if (!isPrivileged && !announcement.isPublished) {
    throw new ApiError('Announcement not found', 404);
  }

  if (!isPrivileged && announcement.expiryDate && new Date(announcement.expiryDate) < new Date()) {
    throw new ApiError('Announcement not found', 404);
  }

  return ApiResponse.success(res, { announcement }, 'Announcement retrieved successfully');
});

// @desc    Create announcement
// @route   POST /api/v1/announcements
// @access  Admin, Teacher
exports.createAnnouncement = catchAsync(async (req, res) => {
  const {
    title,
    content,
    category,
    priority,
    targetAudience,
    publishDate,
    expiryDate,
    isPublished,
    attachmentUrl,
    sendEmail,
    sendSMS,
  } = req.body;

  const insertData = {
    title,
    content,
    category,
    priority,
    target_audience: targetAudience,
    posted_by_id: req.user.id,
    school_id: req.user.school_id,
    publish_date: publishDate || new Date(),
    expiry_date: expiryDate || null,
    is_published: isPublished !== undefined ? parseBoolean(isPublished) : true,
    attachment_url: attachmentUrl || '',
  };

  const row = await db.insert('announcements', insertData);
  const announcement = toCamelCaseAnnouncement(row);

  let distribution = null;
  if (announcement.isPublished && (sendEmail || sendSMS)) {
    const senderRows = await db.raw('SELECT name FROM users WHERE id = $1 LIMIT 1', [req.user.id]);
    const sender = senderRows[0];
    distribution = await distributeAnnouncement(announcement, {
      sendEmail,
      sendSMS,
      senderName: sender?.name,
      schoolId: req.user.school_id,
    });
  }

  // Fire-and-forget in-app notification for target audience
  if (announcement.isPublished) {
    notifyAnnouncementAudience(announcement, req.user.id, req.user.school_id);
  }

  const populatedRows = await db.raw(POPULATE_ANNOUNCEMENT_SQL, [announcement.id]);
  const populatedAnnouncement = toCamelCaseAnnouncement(populatedRows[0]);

  return ApiResponse.success(
    res,
    { announcement: populatedAnnouncement, distribution },
    'Announcement created successfully',
    201
  );
});

// @desc    Update announcement
// @route   PUT /api/v1/announcements/:id
// @access  Admin, Teacher
exports.updateAnnouncement = catchAsync(async (req, res) => {
  const existingRow = await db.findOne('announcements', { id: req.params.id });
  if (!existingRow) {
    throw new ApiError('Announcement not found', 404);
  }

  if (req.user.role !== 'super_admin' && existingRow.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const allowedUpdates = [
    'title',
    'content',
    'category',
    'priority',
    'targetAudience',
    'publishDate',
    'expiryDate',
    'isPublished',
    'attachmentUrl',
  ];

  const updateData = {};
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[ANNOUNCEMENT_FIELD_MAP[field]] = req.body[field];
    }
  });

  if (updateData.is_published !== undefined) {
    updateData.is_published = parseBoolean(updateData.is_published);
  }

  if (Object.keys(updateData).length > 0) {
    await db.update('announcements', updateData, { id: req.params.id });
  }

  const populatedRows = await db.raw(POPULATE_ANNOUNCEMENT_SQL, [req.params.id]);
  const updatedAnnouncement = toCamelCaseAnnouncement(populatedRows[0]);

  return ApiResponse.success(
    res,
    { announcement: updatedAnnouncement },
    'Announcement updated successfully'
  );
});

// @desc    Delete announcement
// @route   DELETE /api/v1/announcements/:id
// @access  Admin, Teacher
exports.deleteAnnouncement = catchAsync(async (req, res) => {
  const existingRow = await db.findOne('announcements', { id: req.params.id });
  if (!existingRow) {
    throw new ApiError('Announcement not found', 404);
  }

  if (req.user.role !== 'super_admin' && existingRow.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  await db.delete('announcements', { id: req.params.id });

  return ApiResponse.success(res, null, 'Announcement deleted successfully');
});

// @desc    Toggle announcement publish status
// @route   PATCH /api/v1/announcements/:id/publish
// @access  Admin, Teacher
exports.togglePublish = catchAsync(async (req, res) => {
  const { sendEmail, sendSMS } = req.body || {};
  const existingRow = await db.findOne('announcements', { id: req.params.id });
  if (!existingRow) {
    throw new ApiError('Announcement not found', 404);
  }

  if (req.user.role !== 'super_admin' && existingRow.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const wasPublished = existingRow.is_published;
  const newIsPublished = !wasPublished;
  await db.update('announcements', { is_published: newIsPublished }, { id: req.params.id });

  let distribution = null;
  if (!wasPublished && newIsPublished && (sendEmail || sendSMS)) {
    const senderRows = await db.raw('SELECT name FROM users WHERE id = $1 LIMIT 1', [req.user.id]);
    const sender = senderRows[0];
    const announcement = toCamelCaseAnnouncement(existingRow);
    announcement.isPublished = newIsPublished;
    distribution = await distributeAnnouncement(announcement, {
      sendEmail,
      sendSMS,
      senderName: sender?.name,
      schoolId: req.user.school_id,
    });
  }

  // Fire-and-forget in-app notification when the announcement is published
  if (!wasPublished && newIsPublished) {
    const announcement = toCamelCaseAnnouncement(existingRow);
    announcement.isPublished = newIsPublished;
    notifyAnnouncementAudience(announcement, req.user.id, req.user.school_id);
  }

  const populatedRows = await db.raw(POPULATE_ANNOUNCEMENT_SQL, [req.params.id]);
  const updatedAnnouncement = toCamelCaseAnnouncement(populatedRows[0]);

  return ApiResponse.success(
    res,
    { announcement: updatedAnnouncement, distribution },
    `Announcement ${updatedAnnouncement.isPublished ? 'published' : 'unpublished'} successfully`
  );
});
