/**
 * Add business days to a date, skipping provided holiday dates.
 * @param {Date} startDate
 * @param {number} days
 * @param {Array<Date|string>} holidays
 * @returns {Date}
 */
const addBusinessDays = (startDate, days, holidays = []) => {
  const holidaySet = new Set(holidays.map((h) => new Date(h).toDateString()));
  const date = new Date(startDate);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6 && !holidaySet.has(date.toDateString())) {
      added++;
    }
  }
  return date;
};

/**
 * Strip time component from a date.
 */
const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Return end of day for a date.
 */
const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

module.exports = { addBusinessDays, startOfDay, endOfDay };
