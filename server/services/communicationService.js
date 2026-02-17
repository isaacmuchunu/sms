const { sendEmail, sendTemplatedEmail } = require('../utils/emailService');
const { sendSMS } = require('../utils/smsService');
const { escapeHtml } = require('../utils/escapeHtml');
const db = require('../db');

/**
 * Resolve the recipients for a given target audience.
 * @param {string} targetAudience - 'all' | 'students' | 'teachers' | 'parents' | 'staff'
 * @param {string|null} schoolId - School UUID to scope recipients
 * @returns {Promise<Array<{id, name, email, phone, role}>>}
 */
const resolveRecipients = async (targetAudience, schoolId) => {
  const status = 'active';
  let query;
  let values;

  if (targetAudience === 'students') {
    query = `SELECT id, name, email, phone, role, preferences FROM users WHERE status = $1 AND role = $2 AND school_id = $3`;
    values = [status, 'student', schoolId];
  } else if (targetAudience === 'teachers') {
    query = `SELECT id, name, email, phone, role, preferences FROM users WHERE status = $1 AND role = ANY($2) AND school_id = $3`;
    values = [status, ['teacher', 'principal'], schoolId];
  } else if (targetAudience === 'parents') {
    query = `SELECT id, name, email, phone, role, preferences FROM users WHERE status = $1 AND role = $2 AND school_id = $3`;
    values = [status, 'parent', schoolId];
  } else if (targetAudience === 'staff') {
    query = `SELECT id, name, email, phone, role, preferences FROM users WHERE status = $1 AND role = ANY($2) AND school_id = $3`;
    values = [status, ['admin', 'super_admin', 'accountant', 'librarian', 'staff'], schoolId];
  } else {
    // 'all' returns every active user in the school
    query = `SELECT id, name, email, phone, role, preferences FROM users WHERE status = $1 AND school_id = $2`;
    values = [status, schoolId];
  }

  return db.raw(query, values);
};

const sendAnnouncementEmail = async (recipient, announcement, senderName) => {
  if (!recipient.email) return { skipped: true, reason: 'No email address' };
  if (recipient.preferences?.notifications?.email === false) {
    return { skipped: true, reason: 'Email notifications disabled' };
  }

  const safeCategory = escapeHtml(announcement.category || 'School');
  const safeTitle = escapeHtml(announcement.title);
  const safeContent = escapeHtml(announcement.content.replace(/\n/g, '<br>'));
  const safeSender = escapeHtml(senderName || 'School Management System');

  const subject = `[${safeCategory}] ${safeTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c5282;">${safeTitle}</h2>
      <p style="color: #555; line-height: 1.5;">${safeContent}</p>
      ${announcement.expiryDate ? `<p style="font-size: 12px; color: #666;">This announcement expires on ${new Date(announcement.expiryDate).toLocaleString()}.</p>` : ''}
      <p style="margin-top: 24px; font-size: 12px; color: #666;">Sent by ${safeSender}</p>
    </div>
  `;

  return await sendEmail({ to: recipient.email, subject, html });
};

const sendAnnouncementSMS = async (recipient, announcement, senderName) => {
  if (!recipient.phone) return { skipped: true, reason: 'No phone number' };
  if (recipient.preferences?.notifications?.sms === false && recipient.preferences?.notifications?.smsAlerts === false) {
    return { skipped: true, reason: 'SMS notifications disabled' };
  }

  const message = `${announcement.title}\n\n${announcement.content}\n\n- ${senderName || 'School'}`;
  return await sendSMS({ to: recipient.phone, message });
};

/**
 * Distribute an announcement via email and/or SMS.
 * @param {Object} announcement - Saved announcement document
 * @param {Object} options
 * @param {boolean} options.sendEmail
 * @param {boolean} options.sendSMS
 * @param {string} options.senderName
 * @returns {Promise<{email: Object, sms: Object}>}
 */
const distributeAnnouncement = async (announcement, options = {}) => {
  const {
    sendEmail: shouldSendEmail = false,
    sendSMS: shouldSendSMS = false,
    senderName = '',
    schoolId,
  } = options;

  if (!shouldSendEmail && !shouldSendSMS) {
    return { email: { sent: 0, skipped: 0, errors: 0 }, sms: { sent: 0, skipped: 0, errors: 0 } };
  }

  const recipients = await resolveRecipients(announcement.targetAudience || 'all', schoolId);

  const emailResults = [];
  const smsResults = [];

  if (shouldSendEmail) {
    await Promise.allSettled(
      recipients.map(async (recipient) => {
        try {
          const result = await sendAnnouncementEmail(recipient, announcement, senderName);
          emailResults.push({ to: recipient.email, ...result });
        } catch (err) {
          emailResults.push({ to: recipient.email, error: err.message });
        }
      })
    );
  }

  if (shouldSendSMS) {
    await Promise.allSettled(
      recipients.map(async (recipient) => {
        try {
          const result = await sendAnnouncementSMS(recipient, announcement, senderName);
          smsResults.push({ to: recipient.phone, ...result });
        } catch (err) {
          smsResults.push({ to: recipient.phone, error: err.message });
        }
      })
    );
  }

  const summarize = (results) => ({
    total: results.length,
    sent: results.filter((r) => !r.skipped && !r.error).length,
    skipped: results.filter((r) => r.skipped).length,
    errors: results.filter((r) => r.error).length,
    details: results,
  });

  return { email: summarize(emailResults), sms: summarize(smsResults) };
};

module.exports = {
  resolveRecipients,
  distributeAnnouncement,
  sendAnnouncementEmail,
  sendAnnouncementSMS,
};
