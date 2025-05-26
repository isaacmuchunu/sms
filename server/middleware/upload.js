const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['.jpg', '.jpeg', '.png'];
const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, '.pdf'];
const ALLOWED_MIME_TYPES = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.pdf': ['application/pdf'],
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine upload folder based on file type
    let uploadPath = 'uploads/';
    if (file.fieldname === 'avatar' || file.fieldname === 'photo') {
      uploadPath += 'images/';
    } else if (file.fieldname === 'document' || file.fieldname === 'marksheet') {
      uploadPath += 'documents/';
    } else {
      uploadPath += 'general/';
    }
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate random filename: timestamp-randomhex.ext
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = ALLOWED_MIME_TYPES[ext] || [];

  if (ALLOWED_FILE_TYPES.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(`Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`),
      false
    );
  }
};

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 5, // Max 5 files per upload
  },
});

// Pre-configured upload middlewares
const uploadAvatar = upload.single('avatar');
const uploadPhoto = upload.single('photo');
const uploadDocument = upload.single('document');
const uploadMultiple = upload.array('files', 5);

// Error handling wrapper for multer
const handleUpload = (uploadMiddleware) => (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'File size too large. Maximum allowed is 5MB.',
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Too many files. Maximum allowed is 5.',
        });
      }
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: err.message,
      });
    }
    if (err) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: err.message,
      });
    }
    next();
  });
};

module.exports = {
  upload,
  uploadAvatar,
  uploadPhoto,
  uploadDocument,
  uploadMultiple,
  handleUpload,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_FILE_TYPES,
  ALLOWED_MIME_TYPES,
};
