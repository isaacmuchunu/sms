const express = require('express');
const router = express.Router();
const Joi = require('joi');
const sessionController = require('../controllers/sessionController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { objectId } = require('../validators/common');

const objectIdParamSchema = Joi.object({
  id: objectId().required(),
});

const userIdParamSchema = Joi.object({
  userId: objectId().required(),
});

router.use(authenticate);

router.get('/me', sessionController.getMySessions);
router.delete('/others', sessionController.revokeOtherSessions);
router.delete(
  '/:id',
  validate(objectIdParamSchema, 'params'),
  sessionController.revokeSession
);
router.delete(
  '/user/:userId',
  authorize('admin', 'super_admin'),
  validate(userIdParamSchema, 'params'),
  sessionController.revokeUserSessions
);

module.exports = router;
