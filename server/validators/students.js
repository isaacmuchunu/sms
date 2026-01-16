const Joi = require('joi');
const { objectId, dateString } = require('./common');

const statusValues = ['active', 'inactive', 'pending', 'transferred', 'graduated', 'suspended'];
const genderValues = ['male', 'female', 'other'];
const bloodGroupValues = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''];
const categoryValues = ['general', 'scholarship', 'boarding', 'day', 'other'];

const studentName = () => Joi.string().trim().min(2).max(50);
const optionalString = () => Joi.string().trim().allow('');

const documentSchema = () =>
  Joi.object({
    name: optionalString(),
    url: optionalString(),
    uploadedAt: dateString(),
  });

const transportSchema = (withDefaults = false) =>
  Joi.object({
    route: objectId().allow(null),
    pickupPoint: optionalString(),
    dropPoint: optionalString(),
    fee: Joi.number().min(0),
  })[withDefaults ? 'default' : 'optional'](withDefaults ? {} : undefined);

const hostelSchema = (withDefaults = false) =>
  Joi.object({
    hostel: objectId().allow(null),
    room: objectId().allow(null),
    fee: Joi.number().min(0),
  })[withDefaults ? 'default' : 'optional'](withDefaults ? {} : undefined);

const medicalInfoSchema = (withDefaults = false) =>
  Joi.object({
    allergies: optionalString(),
    medications: optionalString(),
    emergencyContact: optionalString(),
  })[withDefaults ? 'default' : 'optional'](withDefaults ? {} : undefined);

const baseStudentFields = {
  firstName: studentName(),
  lastName: studentName(),
  gender: Joi.string().valid(...genderValues),
  dob: dateString(),
  phone: optionalString(),
  email: Joi.string().email().lowercase().allow(''),
  address: optionalString(),
  city: optionalString(),
  state: optionalString(),
  pincode: optionalString(),
  aadharNumber: optionalString(),
  admissionDate: dateString(),
  class: objectId(),
  section: objectId(),
  academicYear: objectId(),
  guardians: Joi.array().items(objectId()).max(5),
  category: Joi.string().valid(...categoryValues),
  religion: optionalString(),
  caste: optionalString(),
  bloodGroup: Joi.string().valid(...bloodGroupValues),
  transport: transportSchema(),
  hostel: hostelSchema(),
  previousSchool: optionalString(),
  previousClassPercentage: Joi.number().min(0).max(100),
  fatherName: optionalString(),
  fatherPhone: optionalString(),
  fatherOccupation: optionalString(),
  motherName: optionalString(),
  motherPhone: optionalString(),
  motherOccupation: optionalString(),
  guardianName: optionalString(),
  guardianPhone: optionalString(),
  guardianRelation: optionalString(),
  medicalInfo: medicalInfoSchema(),
  documents: Joi.array().items(documentSchema()),
  status: Joi.string().valid(...statusValues),
  user: objectId().allow(null),
};

const studentCreateSchema = Joi.object({
  admissionNo: Joi.string().trim().required(),
  firstName: studentName().required(),
  lastName: studentName().required(),
  gender: Joi.string().valid(...genderValues).required(),
  dob: dateString().required(),
  phone: optionalString(),
  email: Joi.string().email().lowercase().allow(''),
  address: optionalString(),
  city: optionalString(),
  state: optionalString(),
  pincode: optionalString(),
  aadharNumber: optionalString(),
  admissionDate: dateString(),
  class: objectId().required(),
  section: objectId().required(),
  academicYear: objectId().required(),
  guardians: Joi.array().items(objectId()).max(5).default([]),
  category: Joi.string().valid(...categoryValues).default('general'),
  religion: optionalString(),
  caste: optionalString(),
  bloodGroup: Joi.string().valid(...bloodGroupValues).default(''),
  transport: transportSchema(true),
  hostel: hostelSchema(true),
  previousSchool: optionalString(),
  previousClassPercentage: Joi.number().min(0).max(100),
  fatherName: optionalString(),
  fatherPhone: optionalString(),
  fatherOccupation: optionalString(),
  motherName: optionalString(),
  motherPhone: optionalString(),
  motherOccupation: optionalString(),
  guardianName: optionalString(),
  guardianPhone: optionalString(),
  guardianRelation: optionalString(),
  medicalInfo: medicalInfoSchema(true),
  documents: Joi.array().items(documentSchema()).default([]),
  status: Joi.string().valid(...statusValues).default('active'),
  user: objectId().allow(null),
});

const studentUpdateSchema = Joi.object(baseStudentFields).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

const studentSortByValues = ['createdAt', 'updatedAt', 'firstName', 'lastName', 'admissionNo', 'rollNo', 'admissionDate'];

const studentQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  sortBy: Joi.string()
    .valid(...studentSortByValues)
    .default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  search: Joi.string().trim().allow(''),
  class: objectId(),
  section: objectId(),
  academicYear: objectId(),
  status: Joi.string().valid(...statusValues),
  admissionDateFrom: dateString(),
  admissionDateTo: dateString(),
});

const studentSearchQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  q: Joi.string().trim().min(2).required(),
});

const studentByClassSortByValues = ['rollNo', 'firstName', 'lastName', 'createdAt'];

const studentByClassQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  sortBy: Joi.string().valid(...studentByClassSortByValues).default('rollNo'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

const studentSubResourceQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  startDate: dateString(),
  endDate: dateString(),
});

const studentResultsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  exam: objectId(),
});

const objectIdParamSchema = Joi.object({
  id: objectId().required(),
});

const classIdParamSchema = Joi.object({
  classId: objectId().required(),
});

const bulkImportSchema = Joi.object({
  students: Joi.array().items(studentCreateSchema).min(1).required(),
});

module.exports = {
  studentCreateSchema,
  studentUpdateSchema,
  studentQuerySchema,
  studentSearchQuerySchema,
  studentByClassQuerySchema,
  studentSubResourceQuerySchema,
  studentResultsQuerySchema,
  objectIdParamSchema,
  classIdParamSchema,
  bulkImportSchema,
};
