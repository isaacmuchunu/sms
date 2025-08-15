const Joi = require('joi');
const { objectId, dateString } = require('./common');

const HOSTEL_TYPES = ['boys', 'girls', 'staff', 'mixed'];
const HOSTEL_STATUSES = ['active', 'inactive'];

const ROOM_TYPES = ['single', 'double', 'triple', 'dormitory'];
const ROOM_STATUSES = ['available', 'full', 'under_maintenance'];

const ALLOCATION_STATUSES = ['active', 'inactive'];
const VISITOR_STATUSES = ['checked_in', 'checked_out'];
const VISITOR_APPROVAL_STATUSES = ['pending', 'approved', 'rejected'];

const page = Joi.number().integer().min(1).default(1);
const limit = Joi.number().integer().min(1).max(100).default(25);

const idParamSchema = Joi.object({
  id: objectId().required(),
});

// ── Hostels ────────────────────────────────────────────────

const createHostelSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  type: Joi.string().valid(...HOSTEL_TYPES).required(),
  address: Joi.string().trim().max(255).allow('').default(''),
  warden: objectId().allow(null).default(null),
  phone: Joi.string().trim().max(20).allow('').default(''),
  status: Joi.string().valid(...HOSTEL_STATUSES).default('active'),
});

const updateHostelSchema = Joi.object({
  name: Joi.string().trim().max(100),
  type: Joi.string().valid(...HOSTEL_TYPES),
  address: Joi.string().trim().max(255).allow(''),
  warden: objectId().allow(null),
  phone: Joi.string().trim().max(20).allow(''),
  status: Joi.string().valid(...HOSTEL_STATUSES),
});

const hostelSortValues = ['name', '-name', 'type', '-type', 'status', '-status', 'createdAt', '-createdAt'];

const listHostelsQuerySchema = Joi.object({
  search: Joi.string().trim().allow('').default(''),
  type: Joi.string().valid(...HOSTEL_TYPES),
  status: Joi.string().valid(...HOSTEL_STATUSES),
  page,
  limit,
  sort: Joi.string().trim().valid(...hostelSortValues).default('name'),
});

// ── Rooms ──────────────────────────────────────────────────

const createRoomSchema = Joi.object({
  hostel: objectId().required(),
  roomNo: Joi.string().trim().max(20).required(),
  floor: Joi.string().trim().max(20).allow('').default(''),
  roomType: Joi.string().valid(...ROOM_TYPES).default('double'),
  capacity: Joi.number().integer().min(1).required(),
  monthlyFee: Joi.number().min(0).default(0),
  facilities: Joi.array().items(Joi.string().trim()).default([]),
  beds: Joi.array()
    .items(Joi.object({ bedNo: Joi.string().trim().required() }))
    .max(Joi.ref('capacity'))
    .default([]),
  status: Joi.string().valid(...ROOM_STATUSES).default('available'),
});

const updateRoomSchema = Joi.object({
  roomNo: Joi.string().trim().max(20),
  floor: Joi.string().trim().max(20).allow(''),
  roomType: Joi.string().valid(...ROOM_TYPES),
  capacity: Joi.number().integer().min(1),
  monthlyFee: Joi.number().min(0),
  facilities: Joi.array().items(Joi.string().trim()),
  beds: Joi.array().items(Joi.object({ bedNo: Joi.string().trim().required() })),
  status: Joi.string().valid(...ROOM_STATUSES),
});

const roomSortValues = ['roomNo', '-roomNo', 'floor', '-floor', 'roomType', '-roomType', 'capacity', '-capacity', 'status', '-status', 'createdAt', '-createdAt'];

const listRoomsQuerySchema = Joi.object({
  hostel: objectId(),
  roomType: Joi.string().valid(...ROOM_TYPES),
  status: Joi.string().valid(...ROOM_STATUSES),
  floor: Joi.string().trim(),
  search: Joi.string().trim().allow('').default(''),
  page,
  limit,
  sort: Joi.string().trim().valid(...roomSortValues).default('roomNo'),
});

const allocateRoomSchema = Joi.object({
  studentId: objectId().required(),
  bedNo: Joi.string().trim().allow('').default(''),
  allocationDate: dateString().default(new Date()),
  monthlyFee: Joi.number().min(0),
});

const vacateRoomSchema = Joi.object({
  studentId: objectId().required(),
});

// ── Allocations ────────────────────────────────────────────

const createAllocationSchema = Joi.object({
  student: objectId().required(),
  hostel: objectId().required(),
  room: objectId().required(),
  bedNo: Joi.string().trim().allow('').default(''),
  allocationDate: dateString().default(new Date()),
  monthlyFee: Joi.number().min(0),
});

const updateAllocationSchema = Joi.object({
  bedNo: Joi.string().trim().allow(''),
  allocationDate: dateString(),
  deallocationDate: dateString().allow(null),
  monthlyFee: Joi.number().min(0),
  status: Joi.string().valid(...ALLOCATION_STATUSES),
});

const allocationSortValues = ['createdAt', '-createdAt', 'allocationDate', '-allocationDate', 'status', '-status'];

const listAllocationsQuerySchema = Joi.object({
  hostel: objectId(),
  room: objectId(),
  student: objectId(),
  status: Joi.string().valid(...ALLOCATION_STATUSES),
  startDate: dateString(),
  endDate: dateString(),
  page,
  limit,
  sort: Joi.string().trim().valid(...allocationSortValues).default('-allocationDate'),
});

// ── Visitor Logs ───────────────────────────────────────────

const createVisitorLogSchema = Joi.object({
  student: objectId().required(),
  room: objectId().required(),
  visitorName: Joi.string().trim().max(100).required(),
  visitorPhone: Joi.string().trim().max(20).allow('').default(''),
  relation: Joi.string().trim().max(50).allow('').default(''),
  purpose: Joi.string().trim().max(255).allow('').default(''),
  idProofType: Joi.string().trim().max(50).allow('').default(''),
  idProofNumber: Joi.string().trim().max(100).allow('').default(''),
  entryTime: dateString().default(new Date()),
  exitTime: dateString().allow(null).default(null),
  approvalStatus: Joi.string().valid(...VISITOR_APPROVAL_STATUSES).default('pending'),
  remarks: Joi.string().trim().allow('').default(''),
});

const updateVisitorLogSchema = Joi.object({
  visitorName: Joi.string().trim().max(100),
  visitorPhone: Joi.string().trim().max(20).allow(''),
  relation: Joi.string().trim().max(50).allow(''),
  purpose: Joi.string().trim().max(255).allow(''),
  idProofType: Joi.string().trim().max(50).allow(''),
  idProofNumber: Joi.string().trim().max(100).allow(''),
  entryTime: dateString(),
  exitTime: dateString().allow(null),
  approvalStatus: Joi.string().valid(...VISITOR_APPROVAL_STATUSES),
  remarks: Joi.string().trim().allow(''),
});

const approveVisitorSchema = Joi.object({
  approvalStatus: Joi.string().valid(...VISITOR_APPROVAL_STATUSES).required(),
  remarks: Joi.string().trim().allow('').default(''),
});

const checkoutVisitorSchema = Joi.object({
  exitTime: dateString().default(new Date()),
});

const visitorSortValues = ['createdAt', '-createdAt', 'entryTime', '-entryTime', 'exitTime', '-exitTime', 'status', '-status'];

const listVisitorLogsQuerySchema = Joi.object({
  student: objectId(),
  room: objectId(),
  status: Joi.string().valid(...VISITOR_STATUSES),
  approvalStatus: Joi.string().valid(...VISITOR_APPROVAL_STATUSES),
  startDate: dateString(),
  endDate: dateString(),
  page,
  limit,
  sort: Joi.string().trim().valid(...visitorSortValues).default('-entryTime'),
});

module.exports = {
  idParamSchema,
  createHostelSchema,
  updateHostelSchema,
  listHostelsQuerySchema,
  createRoomSchema,
  updateRoomSchema,
  listRoomsQuerySchema,
  allocateRoomSchema,
  vacateRoomSchema,
  createAllocationSchema,
  updateAllocationSchema,
  listAllocationsQuerySchema,
  createVisitorLogSchema,
  updateVisitorLogSchema,
  approveVisitorSchema,
  checkoutVisitorSchema,
  listVisitorLogsQuerySchema,
};
