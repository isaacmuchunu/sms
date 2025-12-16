const Joi = require('joi');
const { objectId, dateString } = require('./common');

const vehicleStatusValues = ['active', 'inactive', 'under_maintenance'];
const routeStatusValues = ['active', 'inactive'];
const allocationStatusValues = ['active', 'inactive'];
const vehicleTypeValues = ['bus', 'van', 'car', 'other'];

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const stopSchema = Joi.object({
  name: Joi.string().trim().max(200).required(),
  sequence: Joi.number().integer().min(1).optional(),
  pickupTime: Joi.string().trim().pattern(timeRegex).allow('').optional(),
  dropTime: Joi.string().trim().pattern(timeRegex).allow('').optional(),
  fee: Joi.number().min(0).default(0),
});

const vehicleCreateSchema = Joi.object({
  vehicleNo: Joi.string().trim().max(50).required(),
  registrationNo: Joi.string().trim().max(50).required(),
  type: Joi.string().valid(...vehicleTypeValues).default('bus'),
  capacity: Joi.number().integer().min(1).required(),
  model: Joi.string().trim().max(100).allow('').default(''),
  manufacturer: Joi.string().trim().max(100).allow('').default(''),
  insuranceExpiry: dateString().allow(null).default(null),
  pollutionExpiry: dateString().allow(null).default(null),
  fitnessExpiry: dateString().allow(null).default(null),
  driverName: Joi.string().trim().max(100).allow('').default(''),
  driverPhone: Joi.string().trim().max(20).allow('').default(''),
  attendantName: Joi.string().trim().max(100).allow('').default(''),
  status: Joi.string().valid(...vehicleStatusValues).default('active'),
});

const vehicleUpdateSchema = Joi.object({
  vehicleNo: Joi.string().trim().max(50).optional(),
  registrationNo: Joi.string().trim().max(50).optional(),
  type: Joi.string().valid(...vehicleTypeValues).optional(),
  capacity: Joi.number().integer().min(1).optional(),
  model: Joi.string().trim().max(100).allow('').optional(),
  manufacturer: Joi.string().trim().max(100).allow('').optional(),
  insuranceExpiry: dateString().allow(null).optional(),
  pollutionExpiry: dateString().allow(null).optional(),
  fitnessExpiry: dateString().allow(null).optional(),
  driverName: Joi.string().trim().max(100).allow('').optional(),
  driverPhone: Joi.string().trim().max(20).allow('').optional(),
  attendantName: Joi.string().trim().max(100).allow('').optional(),
  status: Joi.string().valid(...vehicleStatusValues).optional(),
}).min(1);

const routeCreateSchema = Joi.object({
  name: Joi.string().trim().max(200).required(),
  routeCode: Joi.string().trim().max(50).required(),
  vehicle: objectId().required(),
  driver: Joi.string().trim().max(100).allow('').default(''),
  attendant: Joi.string().trim().max(100).allow('').default(''),
  stops: Joi.array().items(stopSchema).min(1).required(),
  totalDistance: Joi.number().min(0).default(0),
  monthlyFee: Joi.number().min(0).default(0),
  status: Joi.string().valid(...routeStatusValues).default('active'),
});

const routeUpdateSchema = Joi.object({
  name: Joi.string().trim().max(200).optional(),
  routeCode: Joi.string().trim().max(50).optional(),
  vehicle: objectId().optional(),
  driver: Joi.string().trim().max(100).allow('').optional(),
  attendant: Joi.string().trim().max(100).allow('').optional(),
  stops: Joi.array().items(stopSchema).min(1).optional(),
  totalDistance: Joi.number().min(0).optional(),
  monthlyFee: Joi.number().min(0).optional(),
  status: Joi.string().valid(...routeStatusValues).optional(),
}).min(1);

const allocationCreateSchema = Joi.object({
  student: objectId().required(),
  route: objectId().required(),
  pickupStop: Joi.string().trim().max(200).required(),
  dropStop: Joi.string().trim().max(200).required(),
  monthlyFee: Joi.number().min(0).optional(),
  effectiveFrom: dateString().default(() => new Date()),
  effectiveTo: dateString().allow(null).optional(),
  status: Joi.string().valid(...allocationStatusValues).default('active'),
});

const allocationUpdateSchema = Joi.object({
  route: objectId().optional(),
  pickupStop: Joi.string().trim().max(200).optional(),
  dropStop: Joi.string().trim().max(200).optional(),
  monthlyFee: Joi.number().min(0).optional(),
  effectiveFrom: dateString().optional(),
  effectiveTo: dateString().allow(null).optional(),
  status: Joi.string().valid(...allocationStatusValues).optional(),
}).min(1);

const assignStudentSchema = Joi.object({
  studentId: objectId().required(),
  pickupStop: Joi.string().trim().max(200).optional(),
  dropStop: Joi.string().trim().max(200).optional(),
  stopName: Joi.string().trim().max(200).optional(),
  monthlyFee: Joi.number().min(0).optional(),
});

const removeStudentSchema = Joi.object({
  studentId: objectId().required(),
});

const vehicleSortValues = ['createdAt', '-createdAt', 'vehicleNo', '-vehicleNo', 'registrationNo', '-registrationNo', 'type', '-type', 'capacity', '-capacity', 'model', '-model', 'manufacturer', '-manufacturer', 'status', '-status', 'driverName', '-driverName'];
const routeSortValues = ['createdAt', '-createdAt', 'name', '-name', 'routeCode', '-routeCode', 'status', '-status'];
const allocationSortValues = ['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'status', '-status'];

const vehicleQuerySchema = Joi.object({
  status: Joi.string().valid(...vehicleStatusValues),
  type: Joi.string().valid(...vehicleTypeValues),
  search: Joi.string().trim().allow('').default(''),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  sort: Joi.string().trim().valid(...vehicleSortValues).default('vehicleNo'),
});

const routeQuerySchema = Joi.object({
  status: Joi.string().valid(...routeStatusValues),
  vehicle: objectId(),
  search: Joi.string().trim().allow('').default(''),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  sort: Joi.string().trim().valid(...routeSortValues).default('name'),
});

const allocationQuerySchema = Joi.object({
  student: objectId(),
  route: objectId(),
  status: Joi.string().valid(...allocationStatusValues),
  search: Joi.string().trim().allow('').default(''),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  sort: Joi.string().trim().valid(...allocationSortValues).default('-createdAt'),
});

const objectIdParamSchema = Joi.object({
  id: objectId().required(),
});

module.exports = {
  vehicleCreateSchema,
  vehicleUpdateSchema,
  vehicleQuerySchema,
  routeCreateSchema,
  routeUpdateSchema,
  routeQuerySchema,
  allocationCreateSchema,
  allocationUpdateSchema,
  allocationQuerySchema,
  assignStudentSchema,
  removeStudentSchema,
  objectIdParamSchema,
};
