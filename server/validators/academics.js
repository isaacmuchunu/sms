const Joi = require('joi');
const { objectId } = require('./common');

// ---------- Common helpers ----------

const paginationQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  search: Joi.string().trim().allow('').default(''),
});

const classSortValues = ['numericName', '-numericName', 'name', '-name', 'status', '-status', 'createdAt', '-createdAt'];
const subjectSortValues = ['name', '-name', 'code', '-code', 'type', '-type', 'status', '-status', 'createdAt', '-createdAt'];
const classSubjectSortValues = ['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'weeklyPeriods', '-weeklyPeriods', 'isElective', '-isElective'];
const timetableSortValues = ['dayOfWeek periodNumber', 'dayOfWeek -periodNumber', '-dayOfWeek periodNumber', '-dayOfWeek -periodNumber', 'createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'dayOfWeek', '-dayOfWeek', 'periodNumber', '-periodNumber', 'startTime', '-startTime'];

const timeString = () =>
  Joi.string()
    .trim()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .messages({ 'string.pattern.base': 'Time must be in HH:MM format' });

// ---------- Params ----------

const objectIdParamSchema = Joi.object({
  id: objectId().required(),
});

const classSectionParamsSchema = Joi.object({
  id: objectId().required(),
  sectionId: objectId().required(),
});

const classAllocationParamsSchema = Joi.object({
  id: objectId().required(),
  allocationId: objectId().required(),
});

const classIdParamSchema = Joi.object({
  classId: objectId().required(),
});

const teacherIdParamSchema = Joi.object({
  teacherId: objectId().required(),
});

// ---------- Classes ----------

const classQuerySchema = paginationQuery.keys({
  academicYear: objectId(),
  status: Joi.string().valid('active', 'inactive'),
  sort: Joi.string().trim().valid(...classSortValues).default('numericName'),
});

const sectionSchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  classTeacher: objectId().allow(null).default(null),
  capacity: Joi.number().integer().min(1).default(40),
  roomNumber: Joi.string().trim().allow('').default(''),
  status: Joi.string().valid('active', 'inactive').default('active'),
});

const classBodySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  numericName: Joi.number().integer().min(1).required(),
  academicYear: objectId().required(),
  monthlyFee: Joi.number().min(0).default(0),
  status: Joi.string().valid('active', 'inactive').default('active'),
  subjects: Joi.array().items(objectId()).default([]),
  sections: Joi.array().items(sectionSchema).default([]),
});

const classUpdateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  numericName: Joi.number().integer().min(1),
  academicYear: objectId(),
  monthlyFee: Joi.number().min(0),
  status: Joi.string().valid('active', 'inactive'),
  subjects: Joi.array().items(objectId()),
});

const sectionBodySchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  classTeacher: objectId().allow(null),
  capacity: Joi.number().integer().min(1).default(40),
  roomNumber: Joi.string().trim().allow('').default(''),
  status: Joi.string().valid('active', 'inactive').default('active'),
});

const sectionUpdateSchema = sectionBodySchema.fork(['name'], (schema) => schema.optional());

// ---------- Subjects ----------

const subjectBodySchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  code: Joi.string().trim().min(1).required(),
  type: Joi.string()
    .valid('core', 'elective', 'language', 'co_curricular', 'extra_curricular')
    .default('core'),
  description: Joi.string().trim().allow('').default(''),
  credits: Joi.number().min(0).default(1),
  maxMarks: Joi.number().min(0).default(100),
  passMarks: Joi.number().min(0).default(40),
  applicableClasses: Joi.array().items(objectId()).default([]),
  status: Joi.string().valid('active', 'inactive').default('active'),
});

const subjectUpdateSchema = subjectBodySchema.fork(['name', 'code'], (schema) => schema.optional());

const subjectQuerySchema = paginationQuery.keys({
  type: Joi.string().valid('core', 'elective', 'language', 'co_curricular', 'extra_curricular'),
  status: Joi.string().valid('active', 'inactive'),
  applicableClass: objectId(),
  sort: Joi.string().trim().valid(...subjectSortValues).default('name'),
});

const allocateSubjectSchema = Joi.object({
  classId: objectId().required(),
  sectionId: objectId().required(),
  teacherId: objectId().allow(null),
  weeklyPeriods: Joi.number().integer().min(1).default(5),
  isElective: Joi.boolean().default(false),
  academicYear: objectId(),
});

// ---------- Class-Subject allocations ----------

const classSubjectBodySchema = Joi.object({
  class: objectId(),
  section: objectId().required(),
  subject: objectId().required(),
  teacher: objectId().allow(null),
  academicYear: objectId().required(),
  weeklyPeriods: Joi.number().integer().min(1).default(5),
  isElective: Joi.boolean().default(false),
});

const classSubjectUpdateSchema = Joi.object({
  teacher: objectId().allow(null),
  weeklyPeriods: Joi.number().integer().min(1),
  isElective: Joi.boolean(),
});

const classSubjectQuerySchema = paginationQuery.keys({
  class: objectId(),
  section: objectId(),
  subject: objectId(),
  teacher: objectId(),
  academicYear: objectId(),
  isElective: Joi.boolean(),
  sort: Joi.string().trim().valid(...classSubjectSortValues).default('createdAt'),
});

// ---------- Timetable ----------

const timetableEntryBodySchema = Joi.object({
  academicYear: objectId().required(),
  class: objectId().required(),
  section: objectId().required(),
  subject: objectId().required(),
  teacher: objectId().required(),
  dayOfWeek: Joi.number().integer().min(0).max(6).required(),
  periodNumber: Joi.number().integer().min(1).required(),
  startTime: timeString().required(),
  endTime: timeString().required(),
  roomNumber: Joi.string().trim().allow('').default(''),
  type: Joi.string().valid('regular', 'substitute', 'extra').default('regular'),
  isRecurring: Joi.boolean().default(true),
  effectiveDate: Joi.date().iso().allow(null).default(null),
});

const timetableEntryUpdateSchema = Joi.object({
  academicYear: objectId(),
  class: objectId(),
  section: objectId(),
  subject: objectId(),
  teacher: objectId(),
  dayOfWeek: Joi.number().integer().min(0).max(6),
  periodNumber: Joi.number().integer().min(1),
  startTime: timeString(),
  endTime: timeString(),
  roomNumber: Joi.string().trim().allow(''),
  type: Joi.string().valid('regular', 'substitute', 'extra'),
  isRecurring: Joi.boolean(),
  effectiveDate: Joi.date().iso().allow(null),
});

const timetableQuerySchema = paginationQuery.keys({
  class: objectId(),
  section: objectId(),
  teacher: objectId(),
  academicYear: objectId(),
  dayOfWeek: Joi.number().integer().min(0).max(6),
  sort: Joi.string().trim().valid(...timetableSortValues).default('dayOfWeek periodNumber'),
});

const classTimetableQuerySchema = Joi.object({
  section: objectId(),
  academicYear: objectId(),
});

const teacherTimetableQuerySchema = Joi.object({
  academicYear: objectId(),
  sort: Joi.string().trim().valid(...timetableSortValues).default('dayOfWeek periodNumber'),
});

const generateTimetableSchema = Joi.object({
  academicYear: objectId().required(),
  classId: objectId(),
  sectionId: objectId(),
});

module.exports = {
  objectIdParamSchema,
  classSectionParamsSchema,
  classAllocationParamsSchema,
  classIdParamSchema,
  teacherIdParamSchema,
  classQuerySchema,
  classBodySchema,
  classUpdateSchema,
  sectionBodySchema,
  sectionUpdateSchema,
  subjectBodySchema,
  subjectUpdateSchema,
  subjectQuerySchema,
  allocateSubjectSchema,
  classSubjectBodySchema,
  classSubjectUpdateSchema,
  classSubjectQuerySchema,
  timetableEntryBodySchema,
  timetableEntryUpdateSchema,
  timetableQuerySchema,
  classTimetableQuerySchema,
  teacherTimetableQuerySchema,
  generateTimetableSchema,
};
