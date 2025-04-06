const Joi = require('joi');
const { objectId } = require('./common');

const announcementCategories = ['general', 'academic', 'exam', 'fee', 'event', 'holiday', 'urgent'];
const announcementPriorities = ['low', 'normal', 'high', 'urgent'];
const announcementAudiences = ['all', 'students', 'teachers', 'parents', 'staff'];
const notificationTypes = ['announcement', 'fee', 'attendance', 'exam', 'general', 'alert'];

const announcementIdParam = Joi.object({
  id: objectId().required(),
});

const createAnnouncement = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  content: Joi.string().trim().min(1).max(10000).required(),
  category: Joi.string().valid(...announcementCategories).default('general'),
  priority: Joi.string().valid(...announcementPriorities).default('normal'),
  targetAudience: Joi.string().valid(...announcementAudiences).default('all'),
  publishDate: Joi.date().iso().allow(null).optional(),
  expiryDate: Joi.date().iso().allow(null).optional(),
  isPublished: Joi.boolean().default(true),
  attachmentUrl: Joi.string().uri().allow('', null).optional(),
  sendEmail: Joi.boolean().default(false),
  sendSMS: Joi.boolean().default(false),
});

const updateAnnouncement = Joi.object({
  title: Joi.string().trim().min(1).max(200).optional(),
  content: Joi.string().trim().min(1).max(10000).optional(),
  category: Joi.string().valid(...announcementCategories).optional(),
  priority: Joi.string().valid(...announcementPriorities).optional(),
  targetAudience: Joi.string().valid(...announcementAudiences).optional(),
  publishDate: Joi.date().iso().allow(null).optional(),
  expiryDate: Joi.date().iso().allow(null).optional(),
  isPublished: Joi.boolean().optional(),
  attachmentUrl: Joi.string().uri().allow('', null).optional(),
  sendEmail: Joi.boolean().optional(),
  sendSMS: Joi.boolean().optional(),
}).min(1);

const announcementSortValues = ['publishDate', '-publishDate', 'title', '-title', 'category', '-category', 'priority', '-priority', 'targetAudience', '-targetAudience', 'expiryDate', '-expiryDate', 'isPublished', '-isPublished', 'createdAt', '-createdAt', 'updatedAt', '-updatedAt'];

const listAnnouncementsQuery = Joi.object({
  search: Joi.string().trim().allow('').optional(),
  category: Joi.string().valid(...announcementCategories).optional(),
  priority: Joi.string().valid(...announcementPriorities).optional(),
  targetAudience: Joi.string().valid(...announcementAudiences).optional(),
  isPublished: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  sort: Joi.string().trim().valid(...announcementSortValues).default('-publishDate'),
});

const notificationIdParam = Joi.object({
  id: objectId().required(),
});

const createNotification = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  message: Joi.string().trim().min(1).max(5000).required(),
  type: Joi.string().valid(...notificationTypes).default('general'),
  recipients: Joi.array().items(objectId()).min(1).required(),
  referenceModel: Joi.string().trim().max(50).optional(),
  referenceId: objectId().optional(),
});

const notificationSortValues = ['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'title', '-title', 'type', '-type', 'isRead', '-isRead', 'readAt', '-readAt'];

const listNotificationsQuery = Joi.object({
  type: Joi.string().valid(...notificationTypes).optional(),
  isRead: Joi.boolean().optional(),
  search: Joi.string().trim().allow('').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  sort: Joi.string().trim().valid(...notificationSortValues).default('-createdAt'),
});

module.exports = {
  announcementIdParam,
  createAnnouncement,
  updateAnnouncement,
  listAnnouncementsQuery,
  notificationIdParam,
  createNotification,
  listNotificationsQuery,
};
