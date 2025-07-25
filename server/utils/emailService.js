const nodemailer = require('nodemailer');
const { escapeHtml } = require('./escapeHtml');

const getFromAddress = () => {
  const configured = process.env.EMAIL_FROM;
  if (configured) return configured;
  const user = process.env.EMAIL_USER;
  if (user && user.includes('@')) return `"School Management System" <${user}>`;
  return '"School Management System" <no-reply@school.com>';
};

const createTransporter = () => {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  const port = Number(process.env.EMAIL_PORT) || 587;
  const secure = process.env.EMAIL_SECURE === 'true' || (process.env.EMAIL_SECURE === undefined && port === 465);

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
};

let cachedTransporter = createTransporter();

const refreshTransporter = () => {
  cachedTransporter = createTransporter();
  return cachedTransporter;
};

const isEmailEnabled = () => {
  return Boolean(
    process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS
  );
};

const sendEmail = async ({ to, subject, html, text, attachments }) => {
  if (!to) {
    throw new Error('Email recipient is required');
  }

  const transporter = cachedTransporter || refreshTransporter();

  const mailOptions = {
    from: getFromAddress(),
    to,
    subject,
    text,
    html,
    attachments,
  };

  if (process.env.SKIP_EMAIL_SEND === 'true') {
    console.log('[EMAIL FALLBACK]', JSON.stringify({ to, subject }, null, 2));
    if (text) console.log('[EMAIL TEXT]', text);
    return { messageId: 'fallback', preview: mailOptions };
  }

  if (!transporter) {
    const missing = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS']
      .filter((key) => !process.env[key])
      .join(', ');
    throw new Error(`Email is not configured. Missing environment variables: ${missing}`);
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (err) {
    console.error('[EMAIL ERROR]', err.message);
    throw err;
  }
};

const templates = {
  welcome: (data) => {
    const safeSchoolName = escapeHtml(data.schoolName || 'Our School');
    const safeName = escapeHtml(data.name);
    const safeEmail = escapeHtml(data.email);
    const safeRole = escapeHtml(data.role);
    const loginUrl = escapeHtml(data.loginUrl || `${process.env.FRONTEND_URL}/login`);
    return {
      subject: `Welcome to ${safeSchoolName}, ${safeName}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5282;">Welcome, ${safeName}!</h2>
          <p>Your account has been created successfully.</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Role:</strong> ${safeRole}</p>
          <p>Please login to the portal to get started.</p>
          <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background: #2c5282; color: #fff; text-decoration: none; border-radius: 4px;">Login to Portal</a>
          <p style="margin-top: 24px; font-size: 12px; color: #666;">If you did not expect this email, please contact the administration.</p>
        </div>
      `,
    };
  },

  passwordReset: (data) => {
    const safeName = escapeHtml(data.name);
    const resetUrl = escapeHtml(data.resetUrl);
    return {
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #c53030;">Password Reset Request</h2>
          <p>Hi ${safeName},</p>
          <p>We received a request to reset your password. Click the link below to reset it:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #c53030; color: #fff; text-decoration: none; border-radius: 4px;">Reset Password</a>
          <p style="margin-top: 16px;">This link will expire in <strong>30 minutes</strong>.</p>
          <p>If you did not request a password reset, please ignore this email.</p>
          <p style="font-size: 12px; color: #666;">For security reasons, this link can only be used once.</p>
        </div>
      `,
    };
  },

  passwordChanged: (data) => {
    const safeName = escapeHtml(data.name);
    return {
      subject: 'Password Changed Successfully',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5282;">Password Changed</h2>
          <p>Hi ${safeName},</p>
          <p>Your password has been changed successfully.</p>
          <p>If you did not make this change, please contact the administration immediately.</p>
        </div>
      `,
    };
  },

  parentInvite: (data) => {
    const safeName = escapeHtml(data.name);
    const setPasswordUrl = escapeHtml(data.setPasswordUrl);
    return {
      subject: 'Welcome - Set up your parent portal password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5282;">Welcome, ${safeName}!</h2>
          <p>You have been registered as a parent/guardian in the school management system.</p>
          <p>Click the button below to set your password and access your child's records:</p>
          <a href="${setPasswordUrl}" style="display: inline-block; padding: 12px 24px; background: #2c5282; color: #fff; text-decoration: none; border-radius: 4px;">Set Password</a>
          <p style="margin-top: 16px;">This link will expire in <strong>24 hours</strong> and can only be used once.</p>
          <p>If the button does not work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${setPasswordUrl}</p>
          <p style="font-size: 12px; color: #666;">If you did not expect this email, please contact the school administration.</p>
        </div>
      `,
    };
  },

  feeReceipt: (data) => {
    const safeParentName = escapeHtml(data.parentName || data.studentName);
    const safeStudentName = escapeHtml(data.studentName);
    const safeAmount = escapeHtml(data.amount);
    const safeReceiptNo = escapeHtml(data.receiptNo);
    const safePaidDate = escapeHtml(data.paidDate);
    const safePaymentMode = escapeHtml(data.paymentMode);
    return {
      subject: `Fee Receipt - ${safeReceiptNo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5282;">Fee Payment Receipt</h2>
          <p>Dear ${safeParentName},</p>
          <p>We have received a payment of <strong>${safeAmount}</strong> for <strong>${safeStudentName}</strong>.</p>
          <p><strong>Receipt No:</strong> ${safeReceiptNo}</p>
          <p><strong>Date:</strong> ${safePaidDate}</p>
          <p><strong>Mode:</strong> ${safePaymentMode}</p>
          <p>Please find the receipt attached.</p>
          <p style="font-size: 12px; color: #666;">Thank you for your payment.</p>
        </div>
      `,
    };
  },

  meetingInvitation: (data) => {
    const safeGuardianName = escapeHtml(data.guardianName);
    const safeStudentName = escapeHtml(data.studentName);
    const safeTitle = escapeHtml(data.title);
    const safeScheduledAt = escapeHtml(data.scheduledAt);
    const safeDuration = escapeHtml(data.duration);
    const safeLocation = data.location ? escapeHtml(data.location) : null;
    const safeMeetLink = data.meetLink ? escapeHtml(data.meetLink) : null;
    return {
      subject: `Scheduled Meeting - ${safeTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5282;">Meeting Scheduled</h2>
          <p>Dear ${safeGuardianName},</p>
          <p>A meeting has been scheduled regarding <strong>${safeStudentName}</strong>.</p>
          <p><strong>Title:</strong> ${safeTitle}</p>
          <p><strong>Date & Time:</strong> ${safeScheduledAt}</p>
          <p><strong>Duration:</strong> ${safeDuration} minutes</p>
          ${safeLocation ? `<p><strong>Location:</strong> ${safeLocation}</p>` : ''}
          ${safeMeetLink ? `<p><strong>Join link:</strong> <a href="${safeMeetLink}">${safeMeetLink}</a></p>` : ''}
          <p>Please login to the parent portal for more details.</p>
        </div>
      `,
    };
  },

  meetingReminder: (data) => {
    const safeGuardianName = escapeHtml(data.guardianName);
    const safeStudentName = escapeHtml(data.studentName);
    const safeTitle = escapeHtml(data.title);
    const safeScheduledAt = escapeHtml(data.scheduledAt);
    const safeDuration = escapeHtml(String(data.duration || ''));
    const safeLocation = data.location ? escapeHtml(data.location) : null;
    const safeMeetLink = data.meetLink ? escapeHtml(data.meetLink) : null;
    return {
      subject: `Reminder: ${safeTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5282;">Meeting Reminder</h2>
          <p>Dear ${safeGuardianName},</p>
          <p>This is a friendly reminder about the upcoming meeting regarding <strong>${safeStudentName}</strong>.</p>
          <p><strong>Title:</strong> ${safeTitle}</p>
          <p><strong>Date & Time:</strong> ${safeScheduledAt}</p>
          <p><strong>Duration:</strong> ${safeDuration} minutes</p>
          ${safeLocation ? `<p><strong>Location:</strong> ${safeLocation}</p>` : ''}
          ${safeMeetLink ? `<p><strong>Join link:</strong> <a href="${safeMeetLink}">${safeMeetLink}</a></p>` : ''}
          <p>Please login to the parent portal for more details.</p>
        </div>
      `,
    };
  },

  feeReminder: (data) => {
    const safeParentName = escapeHtml(data.parentName);
    const safeStudentName = escapeHtml(data.studentName);
    const safeAmount = escapeHtml(data.amount);
    const safeDueDate = escapeHtml(data.dueDate);
    return {
      subject: 'Fee Payment Reminder',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #c53030;">Fee Payment Reminder</h2>
          <p>Dear ${safeParentName},</p>
          <p>This is a friendly reminder that the fee payment for your ward <strong>${safeStudentName}</strong> is due.</p>
          <p><strong>Amount Due:</strong> ${safeAmount}</p>
          <p><strong>Due Date:</strong> ${safeDueDate}</p>
          <p>Please make the payment at your earliest convenience to avoid late fees.</p>
        </div>
      `,
    };
  },

  attendanceAlert: (data) => {
    const safeStudentName = escapeHtml(data.studentName);
    const safeStatus = escapeHtml(data.status);
    const safeDate = escapeHtml(data.date);
    const safeClassName = data.className ? escapeHtml(data.className) : null;
    const safeRemarks = data.remarks ? escapeHtml(data.remarks) : null;
    return {
      subject: `Attendance Alert for ${safeStudentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #c53030;">Attendance Alert</h2>
          <p>Dear Parent/Guardian,</p>
          <p>Your ward <strong>${safeStudentName}</strong> was marked <strong style="color: #c53030;">${safeStatus}</strong> on ${safeDate}.</p>
          ${safeClassName ? `<p><strong>Class:</strong> ${safeClassName}</p>` : ''}
          ${safeRemarks ? `<p><strong>Remarks:</strong> ${safeRemarks}</p>` : ''}
          <p>Please contact the class teacher if you have any questions.</p>
        </div>
      `,
    };
  },

  examResult: (data) => {
    const safeName = escapeHtml(data.name);
    const safeExamName = escapeHtml(data.examName);
    const resultUrl = escapeHtml(data.resultUrl || `${process.env.FRONTEND_URL}/login`);
    return {
      subject: `Exam Results Published - ${safeExamName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5282;">Exam Results Published</h2>
          <p>Dear ${safeName},</p>
          <p>The results for <strong>${safeExamName}</strong> have been published.</p>
          <p>Please login to the portal to view your detailed marksheet.</p>
          <a href="${resultUrl}" style="display: inline-block; padding: 12px 24px; background: #2c5282; color: #fff; text-decoration: none; border-radius: 4px;">View Results</a>
        </div>
      `,
    };
  },
};

const sendTemplatedEmail = async (templateName, to, data, options = {}) => {
  const template = templates[templateName];
  if (!template) {
    throw new Error(`Email template "${templateName}" not found`);
  }
  const { subject, html } = template(data);
  return sendEmail({ to, subject, html, ...options });
};

module.exports = {
  transporter: cachedTransporter,
  sendEmail,
  sendTemplatedEmail,
  templates,
  isEmailEnabled,
  refreshTransporter,
};
