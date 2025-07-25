const db = require('../db');
const notificationService = require('../services/notificationService');
const { sendTemplatedEmail } = require('../utils/emailService');
const { sendSMS } = require('../utils/smsService');

/**
 * Scheduled background jobs for the School Management System.
 *
 * NOTE: node-cron is not a project dependency, so this scheduler uses
 * setInterval to run each job once per minute. If node-cron is installed
 * globally or added later, this module can be adapted to cron expressions.
 */

const markOverdueInvoices = async () => {
  try {
    await db.raw(`
      UPDATE fee_invoices
      SET status = 'overdue'
      WHERE due_date < CURRENT_DATE
        AND status IN ('pending', 'partial')
    `);
  } catch (err) {
    console.error('[scheduler] markOverdueInvoices failed:', err.message);
  }
};

const markOverdueLibraryIssues = async () => {
  try {
    await db.raw(`
      UPDATE book_issues
      SET status = 'overdue'
      WHERE due_date < CURRENT_DATE
        AND status = 'issued'
    `);
  } catch (err) {
    console.error('[scheduler] markOverdueLibraryIssues failed:', err.message);
  }
};

const publishAnnouncements = async () => {
  try {
    await db.raw(`
      UPDATE announcements
      SET is_published = true
      WHERE publish_date <= CURRENT_TIMESTAMP
        AND is_published = false
    `);
  } catch (err) {
    console.error('[scheduler] publishAnnouncements failed:', err.message);
  }
};

const unpublishAnnouncements = async () => {
  try {
    await db.raw(`
      UPDATE announcements
      SET is_published = false
      WHERE expiry_date <= CURRENT_TIMESTAMP
        AND is_published = true
    `);
  } catch (err) {
    console.error('[scheduler] unpublishAnnouncements failed:', err.message);
  }
};

const REMINDER_WINDOW_MINUTES = 30;

const fetchUpcomingMeetingsNeedingReminders = async () => {
  return db.raw(
    `
      SELECT
        m.id, m.school_id, m.title, m.description, m.type, m.scheduled_at, m.duration,
        m.location, m.meet_link, m.status, m.notes, m.reminder_sent,
        m.student_id, m.guardian_id, m.organizer_id,
        s.first_name AS student_first_name, s.last_name AS student_last_name, s.user_id AS student_user_id,
        g.first_name AS guardian_first_name, g.last_name AS guardian_last_name,
        g.email AS guardian_email, g.phone AS guardian_phone, g.user_id AS guardian_user_id,
        u.name AS organizer_name
      FROM meetings m
      LEFT JOIN students s ON m.student_id = s.id
      LEFT JOIN guardians g ON m.guardian_id = g.id
      LEFT JOIN users u ON m.organizer_id = u.id
      WHERE m.reminder_sent = false
        AND m.status = 'scheduled'
        AND m.scheduled_at > CURRENT_TIMESTAMP
        AND m.scheduled_at <= CURRENT_TIMESTAMP + $1::interval
      ORDER BY m.scheduled_at ASC
    `,
    [`${REMINDER_WINDOW_MINUTES} minutes`]
  );
};

const sendMeetingReminder = async (meeting) => {
  const {
    title,
    scheduled_at: scheduledAt,
    duration,
    location,
    meet_link: meetLink,
    student_first_name: studentFirstName,
    student_last_name: studentLastName,
    student_user_id: studentUserId,
    guardian_first_name: guardianFirstName,
    guardian_last_name: guardianLastName,
    guardian_email: guardianEmail,
    guardian_phone: guardianPhone,
    guardian_user_id: guardianUserId,
  } = meeting;

  const studentName = `${studentFirstName || ''} ${studentLastName || ''}`.trim();
  const guardianName = `${guardianFirstName || ''} ${guardianLastName || ''}`.trim();
  const formattedScheduledAt = new Date(scheduledAt).toLocaleString();
  const displayLocation = location || meetLink || 'school office';

  // Email reminder to guardian
  if (guardianEmail) {
    try {
      await sendTemplatedEmail('meetingReminder', guardianEmail, {
        guardianName,
        studentName,
        title,
        scheduledAt: formattedScheduledAt,
        duration,
        location,
        meetLink,
      });
    } catch (err) {
      console.error(`[scheduler] Failed to send meeting reminder email for meeting ${meeting.id}:`, err.message);
    }
  }

  // SMS reminder to guardian
  if (guardianPhone) {
    try {
      await sendSMS({
        to: guardianPhone,
        message: `Reminder: ${title} on ${formattedScheduledAt}. Location: ${displayLocation}.`,
      });
    } catch (err) {
      console.error(`[scheduler] Failed to send meeting reminder SMS for meeting ${meeting.id}:`, err.message);
    }
  }

  // In-app notifications for student and guardian users
  const recipientIds = [];
  if (studentUserId) recipientIds.push(studentUserId);
  if (guardianUserId) recipientIds.push(guardianUserId);
  if (recipientIds.length > 0) {
    try {
      await notificationService.createBulkNotifications({
        recipientIds,
        senderId: meeting.organizer_id,
        title: `Reminder: ${title}`,
        message: `Your meeting "${title}" is scheduled at ${formattedScheduledAt}. Location: ${displayLocation}.`,
        type: 'alert',
        referenceModel: 'meetings',
        referenceId: meeting.id,
      });
    } catch (err) {
      console.error(`[scheduler] Failed to create meeting reminder notifications for meeting ${meeting.id}:`, err.message);
    }
  }

  // Mark reminder as sent so it is not processed again
  await db.raw(
    `UPDATE meetings SET reminder_sent = true WHERE id = $1`,
    [meeting.id]
  );
};

const sendMeetingReminders = async () => {
  try {
    const meetings = await fetchUpcomingMeetingsNeedingReminders();
    for (const meeting of meetings) {
      try {
        await sendMeetingReminder(meeting);
      } catch (err) {
        console.error(`[scheduler] sendMeetingReminders failed for meeting ${meeting.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[scheduler] sendMeetingReminders failed:', err.message);
  }
};

const runAllJobs = async () => {
  await markOverdueInvoices();
  await markOverdueLibraryIssues();
  await publishAnnouncements();
  await unpublishAnnouncements();
  await sendMeetingReminders();
};

const startScheduler = (intervalMs = 60 * 1000) => {
  console.log('[scheduler] Starting background jobs...');
  // Run immediately on startup, then on interval.
  runAllJobs();
  const intervalId = setInterval(runAllJobs, intervalMs);

  return {
    intervalId,
    stop: () => clearInterval(intervalId),
  };
};

module.exports = {
  markOverdueInvoices,
  markOverdueLibraryIssues,
  publishAnnouncements,
  unpublishAnnouncements,
  sendMeetingReminders,
  runAllJobs,
  startScheduler,
};
