const Joi = require('joi');
const { objectId } = require('./common');

const FEE_HEAD_TYPES = [
  'tuition',
  'admission',
  'examination',
  'transport',
  'hostel',
  'library',
  'activity',
  'other',
];

const FEE_FREQUENCIES = ['monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time'];
const STATUSES = ['active', 'inactive'];
const INVOICE_STATUSES = ['draft', 'pending', 'partial', 'paid', 'overdue', 'cancelled'];
const PAYMENT_MODES = ['cash', 'cheque', 'mpesa', 'card', 'bank_transfer', 'online', 'dd'];
const PAYMENT_STATUSES = ['completed', 'pending', 'failed', 'cancelled', 'refunded'];
const CONCESSION_TYPES = ['percentage', 'fixed_amount'];
const CATEGORIES = ['general', 'scholarship', 'boarding', 'day', 'other'];

const feeHeadItemSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  code: Joi.string().trim().min(2).max(50).required(),
  description: Joi.string().trim().max(500).allow('').default(''),
  type: Joi.string().valid(...FEE_HEAD_TYPES).required(),
  frequency: Joi.string().valid(...FEE_FREQUENCIES).default('monthly'),
  refundable: Joi.boolean().default(false),
  status: Joi.string().valid(...STATUSES).default('active'),
});

const feeHeadUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  description: Joi.string().trim().max(500).allow(''),
  type: Joi.string().valid(...FEE_HEAD_TYPES),
  frequency: Joi.string().valid(...FEE_FREQUENCIES),
  refundable: Joi.boolean(),
  status: Joi.string().valid(...STATUSES),
}).min(1);

const feeStructureItemSchema = Joi.object({
  feeHead: objectId().required(),
  amount: Joi.number().min(0).required(),
  dueMonths: Joi.array().items(Joi.number().integer().min(1).max(12)).default([]),
});

const feeStructureCreateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required(),
  academicYear: objectId().required(),
  class: objectId().required(),
  category: Joi.string().valid(...CATEGORIES).default('general'),
  items: Joi.array().items(feeStructureItemSchema).min(1).required(),
  totalAmount: Joi.number().min(0).default(0),
  effectiveFrom: Joi.date().iso().required(),
  effectiveTo: Joi.date().iso().greater(Joi.ref('effectiveFrom')).allow(null).default(null),
  status: Joi.string().valid(...STATUSES).default('active'),
});

const feeStructureUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200),
  category: Joi.string().valid(...CATEGORIES),
  items: Joi.array().items(feeStructureItemSchema).min(1),
  totalAmount: Joi.number().min(0),
  effectiveFrom: Joi.date().iso(),
  effectiveTo: Joi.date().iso().allow(null).when('effectiveFrom', {
    is: Joi.date().required(),
    then: Joi.date().greater(Joi.ref('effectiveFrom')),
  }),
  status: Joi.string().valid(...STATUSES),
}).min(1);

const generateInvoiceSchema = Joi.object({
  student: objectId().required(),
  academicYear: objectId().required(),
  dueDate: Joi.date().iso().required(),
  billingMonth: Joi.number().integer().min(1).max(12),
  notes: Joi.string().trim().max(1000).allow('').default(''),
});

const invoiceSortValues = ['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'invoiceNo', '-invoiceNo', 'status', '-status', 'dueDate', '-dueDate'];

const invoiceListQuerySchema = Joi.object({
  student: objectId(),
  academicYear: objectId(),
  status: Joi.string().valid(...INVOICE_STATUSES),
  from: Joi.date().iso(),
  to: Joi.date().iso().when('from', {
    is: Joi.date().required(),
    then: Joi.date().greater(Joi.ref('from')),
  }),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  sort: Joi.string().trim().valid(...invoiceSortValues).default('-createdAt'),
  search: Joi.string().trim().max(100),
});

const applyFineSchema = Joi.object({
  amount: Joi.number().positive().required(),
  reason: Joi.string().trim().max(500).allow('').default(''),
});

const recordPaymentSchema = Joi.object({
  invoice: objectId().required(),
  amount: Joi.number().positive().required(),
  paymentMode: Joi.string().valid(...PAYMENT_MODES).required(),
  transactionId: Joi.string().trim().max(100).allow('').default(''),
  chequeNo: Joi.string().trim().max(50).allow('').default(''),
  bankName: Joi.string().trim().max(100).allow('').default(''),
  paidDate: Joi.date().iso().default(() => new Date().toISOString()),
  waiverApproved: Joi.boolean().default(false),
  remarks: Joi.string().trim().max(500).allow('').default(''),
});

const paymentSortValues = ['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'paidDate', '-paidDate', 'amount', '-amount', 'paymentMode', '-paymentMode', 'status', '-status'];

const paymentListQuerySchema = Joi.object({
  student: objectId(),
  invoice: objectId(),
  status: Joi.string().valid(...PAYMENT_STATUSES),
  paymentMode: Joi.string().valid(...PAYMENT_MODES),
  from: Joi.date().iso(),
  to: Joi.date().iso().when('from', {
    is: Joi.date().required(),
    then: Joi.date().greater(Joi.ref('from')),
  }),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  sort: Joi.string().trim().valid(...paymentSortValues).default('-paidDate'),
});

const receiptNoParamsSchema = Joi.object({
  receiptNo: Joi.string().trim().min(3).max(50).required(),
});

const feeConcessionCreateSchema = Joi.object({
  student: objectId().required(),
  academicYear: objectId().required(),
  feeHead: objectId().allow(null).default(null),
  type: Joi.string().valid(...CONCESSION_TYPES).required(),
  value: Joi.number().min(0).required(),
  reason: Joi.string().trim().max(500).allow('').default(''),
  status: Joi.string().valid(...STATUSES).default('active'),
});

const feeConcessionUpdateSchema = Joi.object({
  feeHead: objectId().allow(null),
  type: Joi.string().valid(...CONCESSION_TYPES),
  value: Joi.number().min(0),
  reason: Joi.string().trim().max(500).allow(''),
  status: Joi.string().valid(...STATUSES),
}).min(1);

const feeStructureSortValues = ['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'name', '-name', 'category', '-category', 'status', '-status'];

const feeStructureListQuerySchema = Joi.object({
  academicYear: objectId(),
  class: objectId(),
  category: Joi.string().valid(...CATEGORIES),
  status: Joi.string().valid(...STATUSES),
  search: Joi.string().trim().max(100),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  sort: Joi.string().trim().valid(...feeStructureSortValues).default('-createdAt'),
});

const concessionSortValues = ['createdAt', '-createdAt', 'updatedAt', '-updatedAt'];

const concessionListQuerySchema = Joi.object({
  student: objectId(),
  academicYear: objectId(),
  feeHead: objectId(),
  status: Joi.string().valid(...STATUSES),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  sort: Joi.string().trim().valid(...concessionSortValues).default('-createdAt'),
});

const reportQuerySchema = Joi.object({
  academicYear: objectId(),
  year: Joi.number().integer().min(2000).max(2100),
  date: Joi.date().iso(),
  from: Joi.date().iso(),
  to: Joi.date().iso().when('from', {
    is: Joi.date().required(),
    then: Joi.date().greater(Joi.ref('from')),
  }),
  status: Joi.string().valid(...INVOICE_STATUSES),
  class: objectId(),
  minBalance: Joi.number().min(0),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
});

const objectIdParamsSchema = Joi.object({
  id: objectId().required(),
});

const studentIdParamsSchema = Joi.object({
  studentId: objectId().required(),
});

const feeHeadSortValues = ['name', '-name', 'code', '-code', 'type', '-type', 'frequency', '-frequency', 'status', '-status', 'createdAt', '-createdAt'];

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  sort: Joi.string().trim().valid(...feeHeadSortValues).default('name'),
  status: Joi.string().valid(...STATUSES),
  search: Joi.string().trim().max(100),
});

module.exports = {
  feeHeadCreateSchema: feeHeadItemSchema,
  feeHeadUpdateSchema,
  feeStructureCreateSchema,
  feeStructureUpdateSchema,
  feeStructureListQuerySchema,
  concessionListQuerySchema,
  generateInvoiceSchema,
  invoiceListQuerySchema,
  applyFineSchema,
  recordPaymentSchema,
  paymentListQuerySchema,
  receiptNoParamsSchema,
  feeConcessionCreateSchema,
  feeConcessionUpdateSchema,
  reportQuerySchema,
  objectIdParamsSchema,
  studentIdParamsSchema,
  listQuerySchema,
};
