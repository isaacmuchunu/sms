const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const paymentController = require('../controllers/paymentController');
const {
  mpesaInitiateSchema,
  stripeIntentSchema,
  checkoutRequestIdParamSchema,
  paymentIdParamSchema,
} = require('../validators/payments');

// Public callbacks (must be before authentication middleware)
router.post('/mpesa/callback', paymentController.mpesaCallback);
router.post('/stripe/webhook', paymentController.stripeWebhook);

router.use(authenticate);

// M-Pesa
router.post(
  '/mpesa/initiate',
  authorize('admin', 'super_admin', 'parent', 'accountant'),
  validate(mpesaInitiateSchema),
  paymentController.initiateMpesa
);

router.get(
  '/mpesa/status/:checkoutRequestId',
  authorize('admin', 'super_admin', 'parent', 'accountant'),
  validate(checkoutRequestIdParamSchema, 'params'),
  paymentController.getMpesaStatus
);

// Stripe
router.post(
  '/stripe/intent',
  authorize('admin', 'super_admin', 'parent', 'accountant'),
  validate(stripeIntentSchema),
  paymentController.createStripeIntent
);

// Receipt
router.post(
  '/:id/receipt/send',
  authorize('admin', 'super_admin', 'parent', 'accountant'),
  validate(paymentIdParamSchema, 'params'),
  paymentController.resendReceipt
);

module.exports = router;
