const Joi = require('joi');
const { objectId } = require('./common');

const createModuleRequestSchema = Joi.object({
  module: Joi.string().valid('transport', 'hostel', 'library').required(),
  notes: Joi.string().trim().max(500).allow(''),
});

const reviewModuleRequestSchema = Joi.object({
  notes: Joi.string().trim().max(500).allow(''),
});

const listModuleRequestsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  status: Joi.string().valid('pending', 'approved', 'rejected'),
  module: Joi.string().valid('transport', 'hostel', 'library'),
});

const objectIdParamSchema = Joi.object({
  id: objectId().required(),
});

module.exports = {
  createModuleRequestSchema,
  reviewModuleRequestSchema,
  listModuleRequestsSchema,
  objectIdParamSchema,
};
