const Joi = require('joi');
const { objectId } = require('./common');

const attendanceStatusValues = ['present', 'absent', 'late', 'half_day', 'on_leave'];
const attendanceTypeValues = ['daily', 'subject'];

const attendanceStatus = () => Joi.string().valid(...attendanceStatusValues);
const attendanceType = () => Joi.string().valid(...attendanceTypeValues).default('daily');
const optionalAttendanceType = () => Joi.string().valid(...attendanceTypeValues);

const normalizeDate = (value) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};

const dateField = () =>
  Joi.date()
    .iso()
    .custom((value) => normalizeDate(value))
    .messages({ 'date.format': 'Please provide a valid ISO date' });

const singleRecord = () =>
  Joi.object({
    studentId: objectId().required(),
    status: attendanceStatus().required(),
    remarks: Joi.string().trim().max(500).allow('').default(''),
  });

const markAttendance = Joi.object({
  studentId: objectId().required(),
  classId: objectId().required(),
  sectionId: objectId().required(),
  academicYearId: objectId(),
  date: dateField().required(),
  status: attendanceStatus().required(),
  type: attendanceType(),
  subjectId: objectId().when('type', {
    is: 'subject',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  period: Joi.number().integer().min(1).max(15),
  remarks: Joi.string().trim().max(500).allow('').default(''),
  isManual: Joi.boolean().default(true),
});

const bulkMarkAttendance = Joi.object({
  classId: objectId().required(),
  sectionId: objectId().required(),
  academicYearId: objectId(),
  date: dateField().required(),
  type: attendanceType(),
  subjectId: objectId().when('type', {
    is: 'subject',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  period: Joi.number().integer().min(1).max(15),
  records: Joi.array().items(singleRecord()).min(1).required(),
});

const updateAttendance = Joi.object({
  status: attendanceStatus(),
  remarks: Joi.string().trim().max(500).allow(''),
  isManual: Joi.boolean(),
}).min(1);

const attendanceParams = Joi.object({
  id: objectId().required(),
});

const dateClassParams = Joi.object({
  date: dateField().required(),
  classId: objectId().required(),
});

const dateClassSectionParams = Joi.object({
  date: dateField().required(),
  classId: objectId().required(),
  sectionId: objectId().required(),
});

const studentParams = Joi.object({
  studentId: objectId().required(),
});

const attendanceSortValues = ['date', '-date', 'status', '-status', 'type', '-type', 'period', '-period', 'createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'student.rollNo', '-student.rollNo', 'student.firstName', '-student.firstName', 'student.lastName', '-student.lastName'];

const paginationQuery = {
  sort: Joi.string().trim().valid(...attendanceSortValues).default('-date'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
};

const attendanceQuery = Joi.object({
  classId: objectId(),
  sectionId: objectId(),
  studentId: objectId(),
  date: dateField(),
  startDate: dateField(),
  endDate: dateField(),
  status: attendanceStatus(),
  type: optionalAttendanceType(),
  subjectId: objectId(),
  search: Joi.string().trim().min(1).max(100),
  ...paginationQuery,
});

const studentAttendanceQuery = Joi.object({
  startDate: dateField(),
  endDate: dateField(),
  status: attendanceStatus(),
  type: optionalAttendanceType(),
  subjectId: objectId(),
  ...paginationQuery,
});

const monthlyReportQuery = Joi.object({
  classId: objectId().required(),
  sectionId: objectId(),
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(2000).max(2100).required(),
});

const dateRangeClassQuery = Joi.object({
  classId: objectId().required(),
  sectionId: objectId(),
  startDate: dateField(),
  endDate: dateField(),
  threshold: Joi.number().min(0).max(100).default(75),
});

const classSummaryQuery = Joi.object({
  classId: objectId().required(),
  sectionId: objectId(),
  date: dateField().required(),
});

module.exports = {
  markAttendance,
  bulkMarkAttendance,
  updateAttendance,
  attendanceParams,
  dateClassParams,
  dateClassSectionParams,
  studentParams,
  attendanceQuery,
  studentAttendanceQuery,
  monthlyReportQuery,
  dateRangeClassQuery,
  classSummaryQuery,
};
