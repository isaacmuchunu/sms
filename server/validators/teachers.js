const Joi = require('joi');
const { objectId, phone } = require('./common');

const teacherStatusValues = ['active', 'inactive', 'resigned'];
const employmentTypeValues = ['full_time', 'part_time', 'contract'];
const genderValues = ['male', 'female', 'other'];

const objectIdRequired = () => objectId().required();

const teacherIdParamSchema = Joi.object({
  id: objectIdRequired(),
});

const classTeacherSchema = Joi.object({
  class: objectId().allow(null),
  section: objectId().allow(null),
});

const teacherBaseSchema = Joi.object({
  employeeId: Joi.string().trim().max(30),
  firstName: Joi.string().trim().min(2).max(50).required(),
  lastName: Joi.string().trim().min(2).max(50).required(),
  gender: Joi.string().valid(...genderValues).required(),
  dob: Joi.date().iso().max('now').required(),
  phone: phone().required(),
  email: Joi.string().trim().email().lowercase().required(),
  address: Joi.string().trim().max(500).allow(''),
  qualification: Joi.string().trim().max(200).allow(''),
  specialization: Joi.string().trim().max(200).allow(''),
  designation: Joi.string().trim().max(100).allow(''),
  department: Joi.string().trim().max(100).allow(''),
  salary: Joi.number().min(0).default(0),
  employmentType: Joi.string().valid(...employmentTypeValues).default('full_time'),
  subjects: Joi.array().items(objectId()).default([]),
  joiningDate: Joi.date().iso().required(),
  status: Joi.string().valid(...teacherStatusValues).default('active'),
  user: objectId(),
  classTeacher: classTeacherSchema,
}).options({ stripUnknown: true });

const updateTeacherSchema = Joi.object({
  employeeId: Joi.string().trim().max(30),
  firstName: Joi.string().trim().min(2).max(50),
  lastName: Joi.string().trim().min(2).max(50),
  gender: Joi.string().valid(...genderValues),
  dob: Joi.date().iso().max('now'),
  phone: phone(),
  email: Joi.string().trim().email().lowercase(),
  address: Joi.string().trim().max(500).allow(''),
  qualification: Joi.string().trim().max(200).allow(''),
  specialization: Joi.string().trim().max(200).allow(''),
  designation: Joi.string().trim().max(100).allow(''),
  department: Joi.string().trim().max(100).allow(''),
  salary: Joi.number().min(0),
  employmentType: Joi.string().valid(...employmentTypeValues),
  subjects: Joi.array().items(objectId()),
  joiningDate: Joi.date().iso(),
  status: Joi.string().valid(...teacherStatusValues),
  user: objectId(),
  classTeacher: classTeacherSchema,
}).options({ stripUnknown: true });

const teacherSortValues = ['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'firstName', '-firstName', 'lastName', '-lastName', 'employeeId', '-employeeId', 'joiningDate', '-joiningDate', 'employmentType', '-employmentType', 'status', '-status', 'designation', '-designation', 'department', '-department'];

const listTeachersQuerySchema = Joi.object({
  status: Joi.string().valid(...teacherStatusValues),
  department: Joi.string().trim(),
  designation: Joi.string().trim(),
  employmentType: Joi.string().valid(...employmentTypeValues),
  search: Joi.string().trim().allow(''),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  sort: Joi.string().trim().valid(...teacherSortValues).default('-createdAt'),
}).unknown(true);

const assignSubjectSchema = Joi.object({
  subjectId: objectIdRequired(),
}).options({ stripUnknown: true });

const assignClassSchema = Joi.object({
  classId: objectIdRequired(),
  sectionId: objectIdRequired(),
}).options({ stripUnknown: true });

const academicYearQuerySchema = Joi.object({
  academicYear: objectId(),
}).unknown(true);

module.exports = {
  teacherIdParamSchema,
  createTeacherSchema: teacherBaseSchema,
  updateTeacherSchema,
  listTeachersQuerySchema,
  assignSubjectSchema,
  assignClassSchema,
  academicYearQuerySchema,
};
