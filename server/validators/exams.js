const Joi = require('joi');
const { objectId } = require('./common');

const EXAM_TYPES = ['unit_test', 'quarterly', 'half_yearly', 'final', 'entrance', 'other'];
const EXAM_STATUSES = ['draft', 'scheduled', 'ongoing', 'completed', 'cancelled'];
const MARK_STATUSES = ['draft', 'submitted', 'verified', 'published'];

const timeString = () =>
  Joi.string()
    .trim()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .messages({ 'string.pattern.base': 'Time must be in HH:mm format' });

const dateString = () => Joi.date();

const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
};

const examCreateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required(),
  examType: Joi.string().valid(...EXAM_TYPES).required(),
  academicYear: objectId().required(),
  startDate: dateString().required(),
  endDate: dateString().required(),
  weightage: Joi.number().min(0).max(100).default(100),
  resultPublishDate: dateString().allow(null),
  description: Joi.string().trim().max(1000).allow('').default(''),
});

const examUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200),
  examType: Joi.string().valid(...EXAM_TYPES),
  academicYear: objectId(),
  startDate: dateString(),
  endDate: dateString(),
  weightage: Joi.number().min(0).max(100),
  resultPublishDate: dateString().allow(null),
  description: Joi.string().trim().max(1000).allow(''),
  status: Joi.string().valid(...EXAM_STATUSES),
});

const scheduleCreateSchema = Joi.object({
  class: objectId().required(),
  section: objectId().required(),
  subject: objectId().required(),
  examDate: dateString().required(),
  startTime: timeString().required(),
  endTime: timeString().required(),
  maxMarks: Joi.number().min(0).required(),
  passMarks: Joi.number().min(0).required(),
  roomNumber: Joi.string().trim().max(50).allow('').default(''),
  invigilator: objectId().allow(null),
  academicYear: objectId(),
});

const scheduleUpdateSchema = Joi.object({
  class: objectId(),
  section: objectId(),
  subject: objectId(),
  examDate: dateString(),
  startTime: timeString(),
  endTime: timeString(),
  maxMarks: Joi.number().min(0),
  passMarks: Joi.number().min(0),
  roomNumber: Joi.string().trim().max(50).allow(''),
  invigilator: objectId().allow(null),
  academicYear: objectId(),
});

const marksEntrySchema = Joi.object({
  marks: Joi.array()
    .items(
      Joi.object({
        student: objectId().required(),
        marksObtained: Joi.number().min(0).required(),
        remarks: Joi.string().trim().max(500).allow('').default(''),
      })
    )
    .min(1)
    .required(),
});

const objectIdParamSchema = Joi.object({ id: objectId().required() });
const examParamsSchema = Joi.object({ examId: objectId().required() });
const examScheduleParamsSchema = Joi.object({
  examId: objectId().required(),
  scheduleId: objectId().required(),
});
const examStudentParamsSchema = Joi.object({
  examId: objectId().required(),
  studentId: objectId().required(),
});
const examClassParamsSchema = Joi.object({
  examId: objectId().required(),
  classId: objectId().required(),
});

const examSortValues = ['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'name', '-name', 'examType', '-examType', 'status', '-status', 'startDate', '-startDate', 'endDate', '-endDate', 'weightage', '-weightage', 'resultPublishDate', '-resultPublishDate', 'isResultPublished', '-isResultPublished'];

const listExamsQuerySchema = Joi.object({
  type: Joi.string().valid(...EXAM_TYPES),
  status: Joi.string().valid(...EXAM_STATUSES),
  academicYear: objectId(),
  search: Joi.string().trim().max(200),
  sort: Joi.string().trim().max(100).valid(...examSortValues).default('-createdAt'),
  ...pagination,
});

const scheduleSortValues = ['examDate startTime', 'examDate -startTime', '-examDate startTime', '-examDate -startTime', 'examDate', '-examDate', 'startTime', '-startTime', 'endTime', '-endTime', 'createdAt', '-createdAt', 'updatedAt', '-updatedAt'];

const listSchedulesQuerySchema = Joi.object({
  class: objectId(),
  section: objectId(),
  subject: objectId(),
  examDate: dateString(),
  sort: Joi.string().trim().max(100).valid(...scheduleSortValues).default('examDate startTime'),
  ...pagination,
});

const markSortValues = ['createdAt', '-createdAt', 'marksObtained', '-marksObtained', 'status', '-status', 'student', '-student', 'subject', '-subject'];

const listMarksQuerySchema = Joi.object({
  status: Joi.string().valid(...MARK_STATUSES),
  search: Joi.string().trim().max(200),
  sort: Joi.string().trim().max(100).valid(...markSortValues).default('createdAt'),
  ...pagination,
});

module.exports = {
  examCreateSchema,
  examUpdateSchema,
  scheduleCreateSchema,
  scheduleUpdateSchema,
  marksEntrySchema,
  objectIdParamSchema,
  examParamsSchema,
  examScheduleParamsSchema,
  examStudentParamsSchema,
  examClassParamsSchema,
  listExamsQuerySchema,
  listSchedulesQuerySchema,
  listMarksQuerySchema,
};
