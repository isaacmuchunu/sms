const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes are protected
router.use(authenticate);

// ── Fee Heads ──────────────────────────────────────────────
router
  .route('/heads')
  .get(feeController.getFeeHeads)
  .post(authorize('admin', 'accountant'), feeController.createFeeHead);

router.put('/heads/:id', authorize('admin', 'accountant'), feeController.updateFeeHead);

// ── Fee Structure ──────────────────────────────────────────
router
  .route('/structure')
  .get(feeController.getFeeStructure)
  .post(authorize('admin', 'accountant'), feeController.setFeeStructure);

// ── Payments ───────────────────────────────────────────────
router.post('/payments/record', authorize('admin', 'accountant'), feeController.recordPayment);
router.post('/payments', authorize('admin', 'accountant'), feeController.recordPayment);
router.get('/payments', authorize('admin', 'accountant'), feeController.getPayments);

// ── Student Ledger ─────────────────────────────────────────
router.get('/student/:studentId/ledger', authorize('admin', 'accountant'), feeController.getStudentLedger);

// ── Reports ────────────────────────────────────────────────
router.get('/outstanding', authorize('admin', 'accountant'), feeController.getOutstanding);
router.get('/daily-collection', authorize('admin', 'accountant'), feeController.getDailyCollection);
router.get('/monthly-collection', authorize('admin', 'accountant'), feeController.getMonthlyCollection);

module.exports = router;
