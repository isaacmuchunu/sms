const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authController = require('../controllers/authController');
const bulkUploadController = require('../controllers/bulkUploadController');
const { authenticate, authorize } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');

// CSV upload configuration
const uploadDir = path.join(__dirname, '..', 'uploads', 'csv');
fs.mkdirSync(uploadDir, { recursive: true });
const ALLOWED_CSV_MIME_TYPES = ['text/csv'];
const csvUpload = multer({
  dest: uploadDir,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.csv' && ALLOWED_CSV_MIME_TYPES.includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Only CSV files with MIME type text/csv are allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Ensures the uploaded temp file is removed after processing, whether it succeeds or fails.
const handleBulkUpload = catchAsync(async (req, res, next) => {
  try {
    await bulkUploadController.bulkUploadUsers(req, res, next);
  } finally {
    if (req.file?.path) {
      try {
        fs.rmSync(req.file.path, { force: true });
      } catch {
        // Best-effort cleanup; do not leak temp files.
      }
    }
  }
});

// Public routes
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.put('/reset-password/:token', authController.resetPassword);
router.post('/logout', authController.logout);
router.post('/set-password', authController.setPassword);

// Protected routes
router.post('/register', authenticate, authorize('admin', 'super_admin'), authController.register);
router.get('/users', authenticate, authorize('admin', 'super_admin'), authController.getUsers);
router.post('/bulk-upload', authenticate, authorize('admin'), csvUpload.single('file'), handleBulkUpload);
router.get('/bulk-upload/template', authenticate, authorize('admin'), bulkUploadController.getBulkUploadTemplate);
router.get('/me', authenticate, authController.getMe);
router.put('/updatedetails', authenticate, authController.updateDetails);
router.put('/updatepassword', authenticate, authController.updatePassword);

module.exports = router;
