const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html, text }) => {
  const mailOptions = {
    from: `"School Management System" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

const templates = {
  welcome: (data) => ({
    subject: `Welcome to ${data.schoolName || 'Our School'}, {{name}}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5282;">Welcome, {{name}}!</h2>
        <p>Your account has been created successfully.</p>
        <p><strong>Email:</strong> {{email}}</p>
        <p><strong>Role:</strong> {{role}}</p>
        <p>Please login to the portal to get started.</p>
        <a href="{{loginUrl}}" style="display: inline-block; padding: 12px 24px; background: #2c5282; color: #fff; text-decoration: none; border-radius: 4px;">Login to Portal</a>
        <p style="margin-top: 24px; font-size: 12px; color: #666;">If you did not expect this email, please contact the administration.</p>
      </div>
    `.replace(/\{\{name\}\}/g, data.name)
      .replace(/\{\{email\}\}/g, data.email)
      .replace(/\{\{role\}\}/g, data.role)
      .replace(/\{\{loginUrl\}\}/g, data.loginUrl || `${process.env.FRONTEND_URL}/login`),
  }),

  passwordReset: (data) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #c53030;">Password Reset Request</h2>
        <p>Hi {{name}},</p>
        <p>We received a request to reset your password. Click the link below to reset it:</p>
        <a href="{{resetUrl}}" style="display: inline-block; padding: 12px 24px; background: #c53030; color: #fff; text-decoration: none; border-radius: 4px;">Reset Password</a>
        <p style="margin-top: 16px;">This link will expire in <strong>15 minutes</strong>.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
        <p style="font-size: 12px; color: #666;">For security reasons, this link can only be used once.</p>
      </div>
    `.replace(/\{\{name\}\}/g, data.name)
      .replace(/\{\{resetUrl\}\}/g, data.resetUrl),
  }),

  passwordChanged: (data) => ({
    subject: 'Password Changed Successfully',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5282;">Password Changed</h2>
        <p>Hi {{name}},</p>
        <p>Your password has been changed successfully.</p>
        <p>If you did not make this change, please contact the administration immediately.</p>
      </div>
    `.replace(/\{\{name\}\}/g, data.name),
  }),

  feeReminder: (data) => ({
    subject: 'Fee Payment Reminder',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #c53030;">Fee Payment Reminder</h2>
        <p>Dear {{parentName}},</p>
        <p>This is a friendly reminder that the fee payment for your ward <strong>{{studentName}}</strong> is due.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="background: #f7fafc;">
            <td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Fee Head</strong></td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">{{feeHead}}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Amount Due</strong></td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">{{amount}}</td>
          </tr>
          <tr style="background: #f7fafc;">
            <td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Due Date</strong></td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">{{dueDate}}</td>
          </tr>
        </table>
        <p>Please make the payment at your earliest convenience to avoid late fees.</p>
        <a href="{{paymentUrl}}" style="display: inline-block; padding: 12px 24px; background: #2c5282; color: #fff; text-decoration: none; border-radius: 4px;">Pay Now</a>
      </div>
    `.replace(/\{\{parentName\}\}/g, data.parentName)
      .replace(/\{\{studentName\}\}/g, data.studentName)
      .replace(/\{\{feeHead\}\}/g, data.feeHead)
      .replace(/\{\{amount\}\}/g, data.amount)
      .replace(/\{\{dueDate\}\}/g, data.dueDate)
      .replace(/\{\{paymentUrl\}\}/g, data.paymentUrl || `${process.env.FRONTEND_URL}/fees`),
  }),

  attendanceAlert: (data) => ({
    subject: 'Attendance Alert for {{studentName}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #c53030;">Attendance Alert</h2>
        <p>Dear Parent/Guardian,</p>
        <p>Your ward <strong>{{studentName}}</strong> was marked <strong style="color: #c53030;">{{status}}</strong> on {{date}}.</p>
        <p><strong>Class:</strong> {{className}}</p>
        {{remarks}}
        <p>Please contact the class teacher if you have any questions.</p>
      </div>
    `.replace(/\{\{studentName\}\}/g, data.studentName)
      .replace(/\{\{status\}\}/g, data.status)
      .replace(/\{\{date\}\}/g, data.date)
      .replace(/\{\{className\}\}/g, data.className)
      .replace(/\{\{remarks\}\}/g, data.remarks ? `<p><strong>Remarks:</strong> ${data.remarks}</p>` : ''),
  }),

  examResult: (data) => ({
    subject: 'Exam Results Published - {{examName}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5282;">Exam Results Published</h2>
        <p>Dear {{name}},</p>
        <p>The results for <strong>{{examName}}</strong> have been published.</p>
        <p>Please login to the student portal to view your detailed marksheet.</p>
        <a href="{{resultUrl}}" style="display: inline-block; padding: 12px 24px; background: #2c5282; color: #fff; text-decoration: none; border-radius: 4px;">View Results</a>
      </div>
    `.replace(/\{\{name\}\}/g, data.name)
      .replace(/\{\{examName\}\}/g, data.examName)
      .replace(/\{\{resultUrl\}\}/g, data.resultUrl || `${process.env.FRONTEND_URL}/results`),
  }),
};

const sendTemplatedEmail = async (templateName, to, data) => {
  const template = templates[templateName];
  if (!template) {
    throw new Error(`Email template "${templateName}" not found`);
  }
  const { subject, html } = template(data);
  return sendEmail({ to, subject, html });
};

module.exports = {
  transporter,
  sendEmail,
  sendTemplatedEmail,
  templates,
};
