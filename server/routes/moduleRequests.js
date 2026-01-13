const express = require('express');
const router = express.Router();
const moduleRequestController = require('../controllers/moduleRequestController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  objectIdParamSchema,
  reviewModuleRequestSchema,
} = require('../validators/moduleRequests');

router.use(authenticate);

router.patch(
  '/:id/approve',
  authorize('super_admin'),
  validate(objectIdParamSchema, 'params'),
  validate(reviewModuleRequestSchema, 'body'),
  moduleRequestController.approveModuleRequest
);

router.patch(
  '/:id/reject',
  authorize('super_admin'),
  validate(objectIdParamSchema, 'params'),
  validate(reviewModuleRequestSchema, 'body'),
  moduleRequestController.rejectModuleRequest
);

module.exports = router;
