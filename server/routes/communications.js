const express = require('express');
const router = express.Router();
const communicationController = require('../controllers/communicationController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/status', authorize('admin', 'teacher', 'super_admin'), communicationController.getStatus);
router.post('/test-email', authorize('admin', 'super_admin'), communicationController.testEmail);
router.post('/test-sms', authorize('admin', 'super_admin'), communicationController.testSMS);

module.exports = router;
