const express = require('express');
const router = express.Router();
const academicYearController = require('../controllers/academicYearController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { objectIdParamSchema } = require('../validators/academics');
const Joi = require('joi');

const academicYearSortValues = ['startDate', '-startDate', 'endDate', '-endDate', 'name', '-name', 'status', '-status', 'isCurrent', '-isCurrent', 'createdAt', '-createdAt'];

const listAcademicYearsQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'archived'),
  isCurrent: Joi.boolean(),
  sort: Joi.string().trim().valid(...academicYearSortValues).default('-startDate'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
});

router.use(authenticate);

router.get(
  '/',
  authorize('admin', 'principal', 'teacher', 'student', 'parent'),
  validate(listAcademicYearsQuerySchema, 'query'),
  academicYearController.getAcademicYears
);

router.get(
  '/current',
  authorize('admin', 'principal', 'teacher', 'student', 'parent'),
  academicYearController.getCurrentAcademicYear
);

router.get(
  '/:id',
  authorize('admin', 'principal', 'teacher', 'student', 'parent'),
  validate(objectIdParamSchema, 'params'),
  academicYearController.getAcademicYear
);

module.exports = router;
