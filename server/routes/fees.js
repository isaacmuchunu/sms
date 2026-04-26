const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate');
const feeController = require('../controllers/feeController');
const { authenticate, authorize } = require('../middleware/auth');
const {
  feeHeadCreateSchema,
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
} = require('../validators/fees');

const readRoles = ['admin', 'principal', 'accountant'];
const receiptRoles = ['admin', 'principal', 'accountant', 'parent', 'student'];
const writeRoles = ['admin', 'accountant'];

router.use(authenticate);

// ── Fee Heads ──────────────────────────────────────────────
router
  .route('/heads')
  .get(authorize(...readRoles), validate(listQuerySchema, 'query'), feeController.getFeeHeads)
  .post(authorize(...writeRoles), validate(feeHeadCreateSchema), feeController.createFeeHead);

router
  .route('/heads/:id')
  .get(authorize(...readRoles), validate(objectIdParamsSchema, 'params'), feeController.getFeeHead)
  .put(authorize(...writeRoles), validate(objectIdParamsSchema, 'params'), validate(feeHeadUpdateSchema), feeController.updateFeeHead)
  .delete(authorize(...writeRoles), validate(objectIdParamsSchema, 'params'), feeController.deleteFeeHead);

// ── Fee Structures ──────────────────────────────────────────
router
  .route('/structures')
  .get(authorize(...readRoles), validate(feeStructureListQuerySchema, 'query'), feeController.getFeeStructures)
  .post(authorize(...writeRoles), validate(feeStructureCreateSchema), feeController.createFeeStructure);

router
  .route('/structures/:id')
  .get(authorize(...readRoles), validate(objectIdParamsSchema, 'params'), feeController.getFeeStructure)
  .put(authorize(...writeRoles), validate(objectIdParamsSchema, 'params'), validate(feeStructureUpdateSchema), feeController.updateFeeStructure)
  .delete(authorize(...writeRoles), validate(objectIdParamsSchema, 'params'), feeController.deleteFeeStructure);

// Backward-compatible singular aliases
router
  .route('/structure')
  .get(authorize(...readRoles), validate(feeStructureListQuerySchema, 'query'), feeController.getFeeStructures)
  .post(authorize(...writeRoles), validate(feeStructureCreateSchema), feeController.createFeeStructure);

// ── Invoices ────────────────────────────────────────────────
router
  .route('/invoices')
  .get(authorize(...readRoles), validate(invoiceListQuerySchema, 'query'), feeController.getInvoices)
  .post(authorize(...writeRoles), validate(generateInvoiceSchema), feeController.generateInvoice);

router
  .route('/invoices/:id')
  .get(authorize(...readRoles), validate(objectIdParamsSchema, 'params'), feeController.getInvoice);

router.patch('/invoices/:id/cancel', authorize(...writeRoles), validate(objectIdParamsSchema, 'params'), feeController.cancelInvoice);

router.post(
  '/invoices/:id/fine',
  authorize(...writeRoles),
  validate(objectIdParamsSchema, 'params'),
  validate(applyFineSchema),
  feeController.applyFine
);

// ── Payments ────────────────────────────────────────────────
router
  .route('/payments')
  .get(authorize(...readRoles), validate(paymentListQuerySchema, 'query'), feeController.getPayments)
  .post(authorize(...writeRoles), validate(recordPaymentSchema), feeController.recordPayment);

router.post('/payments/record', authorize(...writeRoles), validate(recordPaymentSchema), feeController.recordPayment);

router.get('/payments/receipt/:receiptNo', authorize(...receiptRoles), validate(receiptNoParamsSchema, 'params'), feeController.getReceipt);
router.get('/payments/:id/receipt.pdf', authorize(...receiptRoles), validate(objectIdParamsSchema, 'params'), feeController.downloadReceipt);

router
  .route('/payments/:id')
  .get(authorize(...receiptRoles), validate(objectIdParamsSchema, 'params'), feeController.getPayment);

// ── Concessions ─────────────────────────────────────────────
router
  .route('/concessions')
  .get(authorize(...readRoles), validate(concessionListQuerySchema, 'query'), feeController.getConcessions)
  .post(authorize(...writeRoles), validate(feeConcessionCreateSchema), feeController.createConcession);

router
  .route('/concessions/:id')
  .get(authorize(...readRoles), validate(objectIdParamsSchema, 'params'), feeController.getConcession)
  .put(authorize(...writeRoles), validate(objectIdParamsSchema, 'params'), validate(feeConcessionUpdateSchema), feeController.updateConcession)
  .delete(authorize(...writeRoles), validate(objectIdParamsSchema, 'params'), feeController.deleteConcession);

// ── Student Ledger ──────────────────────────────────────────
router.get(
  '/student/:studentId/ledger',
  authorize(...readRoles),
  validate(studentIdParamsSchema, 'params'),
  feeController.getStudentLedger
);

// ── Reports ─────────────────────────────────────────────────
router.get('/reports/outstanding', authorize(...readRoles), validate(reportQuerySchema, 'query'), feeController.getOutstanding);
router.get('/reports/daily-collection', authorize(...readRoles), validate(reportQuerySchema, 'query'), feeController.getDailyCollection);
router.get('/reports/monthly-collection', authorize(...readRoles), validate(reportQuerySchema, 'query'), feeController.getMonthlyCollection);
router.get('/reports/defaulters', authorize(...readRoles), validate(reportQuerySchema, 'query'), feeController.getDefaulters);

// Backward-compatible report aliases
router.get('/outstanding', authorize(...readRoles), validate(reportQuerySchema, 'query'), feeController.getOutstanding);
router.get('/daily-collection', authorize(...readRoles), validate(reportQuerySchema, 'query'), feeController.getDailyCollection);
router.get('/monthly-collection', authorize(...readRoles), validate(reportQuerySchema, 'query'), feeController.getMonthlyCollection);

module.exports = router;
