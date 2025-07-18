const Joi = require('joi');
const { objectId, status } = require('./common');

const createSchoolSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required(),
  address: Joi.string().trim().max(500).allow(''),
  phone: Joi.string().trim().max(50).allow(''),
  email: Joi.string().email().lowercase().allow(''),
  website: Joi.string().uri().allow(''),
  affiliationNo: Joi.string().trim().max(100).allow(''),
  board: Joi.string().trim().max(100).allow(''),
  establishedYear: Joi.number().integer().min(1800).max(2100).allow(null),
  principalName: Joi.string().trim().max(200).allow(''),
  adminName: Joi.string().trim().min(2).max(200).allow(''),
  adminEmail: Joi.string().email().lowercase().allow(''),
  adminPassword: Joi.string().min(8).allow(''),
});

const updateSchoolSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200),
  address: Joi.string().trim().max(500).allow(''),
  phone: Joi.string().trim().max(50).allow(''),
  email: Joi.string().email().lowercase().allow(''),
  website: Joi.string().uri().allow(''),
  affiliationNo: Joi.string().trim().max(100).allow(''),
  board: Joi.string().trim().max(100).allow(''),
  establishedYear: Joi.number().integer().min(1800).max(2100).allow(null),
  principalName: Joi.string().trim().max(200).allow(''),
  status: Joi.string().valid('active', 'inactive'),
}).min(1);

const addAdminSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required(),
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(8).allow(''),
});

const listSchoolsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  search: Joi.string().trim().max(200).allow(''),
  status: Joi.string().valid('active', 'inactive'),
});

const listSchoolUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  role: Joi.string().valid('admin', 'teacher', 'accountant', 'librarian', 'staff', 'parent', 'student'),
  search: Joi.string().trim().max(200).allow(''),
});

const objectIdParamSchema = Joi.object({
  id: objectId().required(),
});

const updateModulesSchema = Joi.object({
  modules: Joi.object({
    transport: Joi.boolean(),
    hostel: Joi.boolean(),
    library: Joi.boolean(),
  }).min(1).required(),
}).min(1);

module.exports = {
  createSchoolSchema,
  updateSchoolSchema,
  updateModulesSchema,
  addAdminSchema,
  listSchoolsQuerySchema,
  listSchoolUsersQuerySchema,
  objectIdParamSchema,
};
