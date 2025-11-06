const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schoolController');
const moduleRequestController = require('../controllers/moduleRequestController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createSchoolSchema,
  updateSchoolSchema,
  updateModulesSchema,
  addAdminSchema,
  objectIdParamSchema,
  listSchoolsQuerySchema,
  listSchoolUsersQuerySchema,
} = require('../validators/schools');
const {
  createModuleRequestSchema,
  listModuleRequestsSchema,
} = require('../validators/moduleRequests');

router.use(authenticate);

router
  .route('/')
  .get(authorize('super_admin'), validate(listSchoolsQuerySchema, 'query'), schoolController.getSchools)
  .post(authorize('super_admin'), validate(createSchoolSchema, 'body'), schoolController.createSchool);

router
  .route('/:id')
  .get(authorize('super_admin', 'admin'), validate(objectIdParamSchema, 'params'), schoolController.getSchool)
  .put(authorize('super_admin', 'admin'), validate(objectIdParamSchema, 'params'), validate(updateSchoolSchema, 'body'), schoolController.updateSchool)
  .delete(authorize('super_admin'), validate(objectIdParamSchema, 'params'), schoolController.deleteSchool);

router
  .route('/:id/admins')
  .post(authorize('super_admin'), validate(objectIdParamSchema, 'params'), validate(addAdminSchema, 'body'), schoolController.addSchoolAdmin);

router.patch(
  '/:id/modules',
  authorize('super_admin'),
  validate(objectIdParamSchema, 'params'),
  validate(updateModulesSchema, 'body'),
  schoolController.updateSchoolModules
);

router
  .route('/:id/users')
  .get(authorize('super_admin', 'admin'), validate(objectIdParamSchema, 'params'), validate(listSchoolUsersQuerySchema, 'query'), schoolController.getSchoolUsers);

router
  .route('/:id/module-requests')
  .get(
    authorize('super_admin', 'admin'),
    validate(objectIdParamSchema, 'params'),
    validate(listModuleRequestsSchema, 'query'),
    moduleRequestController.getModuleRequests
  )
  .post(
    authorize('admin'),
    validate(objectIdParamSchema, 'params'),
    validate(createModuleRequestSchema, 'body'),
    moduleRequestController.createModuleRequest
  );

module.exports = router;
