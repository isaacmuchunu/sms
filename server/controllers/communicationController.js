const { sendEmail } = require('../utils/emailService');
const { sendSMS } = require('../utils/smsService');
const { isEmailEnabled } = require('../utils/emailService');
const { isSMSEnabled } = require('../utils/smsService');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// @desc    Get current communication configuration status
// @route   GET /api/v1/communications/status
// @access  Admin, Teacher
exports.getStatus = catchAsync(async (req, res) => {
  return ApiResponse.success(
    res,
    {
      email: {
        enabled: isEmailEnabled(),
        host: process.env.EMAIL_HOST || null,
        user: process.env.EMAIL_USER || null,
      },
      sms: {
        enabled: isSMSEnabled(),
        username: process.env.AFRICAS_TALKING_USERNAME || null,
      },
    },
    'Communication status retrieved'
  );
});

// @desc    Send a test email
// @route   POST /api/v1/communications/test-email
// @access  Admin
exports.testEmail = catchAsync(async (req, res) => {
  const { to } = req.body;

  if (!to) {
    throw new ApiError('Recipient email address is required', 400);
  }

  const result = await sendEmail({
    to,
    subject: 'Test email from School Management System',
    html: '<p>This is a test email from your School Management System.</p>',
    text: 'This is a test email from your School Management System.',
  });

  return ApiResponse.success(
    res,
    { messageId: result.messageId || result.preview?.messageId || 'test' },
    `Test email sent to ${to}`
  );
});

// @desc    Send a test SMS
// @route   POST /api/v1/communications/test-sms
// @access  Admin
exports.testSMS = catchAsync(async (req, res) => {
  const { to } = req.body;

  if (!to) {
    throw new ApiError('Recipient phone number is required', 400);
  }

  const result = await sendSMS({
    to,
    message: 'This is a test SMS from your School Management System.',
  });

  return ApiResponse.success(res, result, `Test SMS sent to ${to}`);
});
