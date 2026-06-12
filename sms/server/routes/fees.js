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
  .post(authorize('admin'), feeController.createFeeHead);

router.put('/heads/:id', authorize('admin'), feeController.updateFeeHead);

// ── Fee Structure ──────────────────────────────────────────
router
  .route('/structure')
  .get(feeController.getFeeStructure)
  .post(authorize('admin'), feeController.setFeeStructure);

// ── Payments ───────────────────────────────────────────────
router.post('/payments/record', feeController.recordPayment);
router.get('/payments', feeController.getPayments);

// ── Student Ledger ─────────────────────────────────────────
router.get('/student/:studentId/ledger', feeController.getStudentLedger);

// ── Reports ────────────────────────────────────────────────
router.get('/outstanding', feeController.getOutstanding);
router.get('/daily-collection', feeController.getDailyCollection);
router.get('/monthly-collection', feeController.getMonthlyCollection);

module.exports = router;
