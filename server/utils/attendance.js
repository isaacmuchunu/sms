/**
 * Calculate attendance percentage using the standardized formula.
 * @param {Object} counts
 * @param {number} counts.present
 * @param {number} counts.absent
 * @param {number} counts.late
 * @param {number} counts.halfDay
 * @param {number} counts.onLeave
 * @returns {number}
 */
const calculateAttendancePercentage = ({ present = 0, absent = 0, late = 0, halfDay = 0, onLeave = 0 } = {}) => {
  const total = present + absent + late + halfDay + onLeave;
  if (total === 0) return 0;
  const effective = present + late + halfDay * 0.5 + onLeave;
  return Number(((effective / total) * 100).toFixed(2));
};

module.exports = { calculateAttendancePercentage };
