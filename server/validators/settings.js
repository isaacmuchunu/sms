const Joi = require('joi');
const { objectId, phone } = require('./common');

const schoolUpdateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200),
  address: Joi.string().trim().allow('').max(500),
  phone: Joi.string().trim().allow('').max(20),
  email: Joi.string().trim().allow('').email().max(200),
  website: Joi.string().trim().allow('').max(200),
  affiliationNo: Joi.string().trim().allow('').max(100),
  board: Joi.string().trim().allow('').max(100),
  establishedYear: Joi.number().integer().min(1800).max(2100).allow(null, ''),
  principalName: Joi.string().trim().allow('').max(200),
  status: Joi.string().valid('active', 'inactive'),
}).min(1);

const termSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
});

const promotionCriteriaSchema = Joi.object({
  minAggregatePercentage: Joi.number().min(0).max(100).default(40),
  maxFailingSubjects: Joi.number().integer().min(0).default(2),
  minAttendancePercentage: Joi.number().min(0).max(100).default(75),
});

const academicYearBodySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  terms: Joi.array().items(termSchema).default([]),
  isCurrent: Joi.boolean().default(false),
  lateThresholdMinutes: Joi.number().integer().min(0).default(10),
  promotionCriteria: promotionCriteriaSchema,
});

const academicYearUpdateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  terms: Joi.array().items(termSchema),
  isCurrent: Joi.boolean(),
  status: Joi.string().valid('active', 'archived'),
  lateThresholdMinutes: Joi.number().integer().min(0),
  promotionCriteria: promotionCriteriaSchema,
}).min(1);

const objectIdParamSchema = Joi.object({
  id: objectId().required(),
});

const gradeSchema = Joi.object({
  grade: Joi.string().trim().min(1).max(10).required(),
  minPercent: Joi.number().min(0).max(100).required(),
  maxPercent: Joi.number().min(0).max(100).required(),
  points: Joi.number().min(0).default(0),
  remarks: Joi.string().trim().allow('').max(200).default(''),
}).custom((value, helpers) => {
  if (value.minPercent > value.maxPercent) {
    return helpers.error('grade.range', { message: 'minPercent must not exceed maxPercent' });
  }
  return value;
});

const gradingScaleUpdateSchema = Joi.object({
  grades: Joi.array().items(gradeSchema).min(1).required(),
});

const notificationSettingsSchema = Joi.object({
  emailAnnouncements: Joi.boolean(),
  smsAlerts: Joi.boolean(),
  pushNotifications: Joi.boolean(),
  feeReminders: Joi.boolean(),
  attendanceAlerts: Joi.boolean(),
  examResults: Joi.boolean(),
});

module.exports = {
  schoolUpdateSchema,
  academicYearBodySchema,
  academicYearUpdateSchema,
  objectIdParamSchema,
  gradingScaleUpdateSchema,
  notificationSettingsSchema,
};
