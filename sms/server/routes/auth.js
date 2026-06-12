const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

// Public routes
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.put('/reset-password/:token', authController.resetPassword);
router.post('/logout', authController.logout);

// Protected routes
router.post('/register', authenticate, authorize('admin'), authController.register);
router.get('/me', authenticate, authController.getMe);
router.put('/updatedetails', authenticate, authController.updateDetails);
router.put('/updatepassword', authenticate, authController.updatePassword);

module.exports = router;
