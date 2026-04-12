const db = require('../db');

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

const runAllJobs = async () => {
  await markOverdueInvoices();
  await markOverdueLibraryIssues();
  await publishAnnouncements();
  await unpublishAnnouncements();
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
  runAllJobs,
  startScheduler,
};
