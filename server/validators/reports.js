const Joi = require('joi');
const { objectId } = require('./common');

const dashboardQuerySchema = Joi.object({
  academicYear: objectId(),
});

const studentStatsQuerySchema = Joi.object({
  academicYear: objectId(),
});

const feeStatsQuerySchema = Joi.object({
  year: Joi.number().integer().min(2000).max(2100),
});

const attendanceStatsQuerySchema = Joi.object({
  month: Joi.number().integer().min(1).max(12),
  year: Joi.number().integer().min(2000).max(2100),
});

const examStatsQuerySchema = Joi.object({
  examId: objectId(),
});

module.exports = {
  dashboardQuerySchema,
  studentStatsQuerySchema,
  feeStatsQuerySchema,
  attendanceStatsQuerySchema,
  examStatsQuerySchema,
};
