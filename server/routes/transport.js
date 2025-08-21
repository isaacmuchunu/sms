const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transportController');
const { authenticate, authorize, requireModule } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  vehicleCreateSchema,
  vehicleUpdateSchema,
  vehicleQuerySchema,
  routeCreateSchema,
  routeUpdateSchema,
  routeQuerySchema,
  allocationCreateSchema,
  allocationUpdateSchema,
  allocationQuerySchema,
  assignStudentSchema,
  removeStudentSchema,
  objectIdParamSchema,
} = require('../validators/transport');

const readRoles = ['admin', 'principal', 'transport_manager'];
const writeRoles = ['admin', 'transport_manager'];

router.use(authenticate, requireModule('transport'));

// ── Vehicles ─────────────────────────────────────────────────
router
  .route('/vehicles')
  .get(authorize(...readRoles), validate(vehicleQuerySchema, 'query'), transportController.getVehicles)
  .post(
    authorize(...writeRoles),
    validate(vehicleCreateSchema, 'body'),
    transportController.createVehicle
  );

router
  .route('/vehicles/:id')
  .get(authorize(...readRoles), validate(objectIdParamSchema, 'params'), transportController.getVehicle)
  .put(
    authorize(...writeRoles),
    validate(objectIdParamSchema, 'params'),
    validate(vehicleUpdateSchema, 'body'),
    transportController.updateVehicle
  )
  .delete(
    authorize(...writeRoles),
    validate(objectIdParamSchema, 'params'),
    transportController.deleteVehicle
  );

// ── Routes ───────────────────────────────────────────────────
router
  .route('/routes')
  .get(authorize(...readRoles), validate(routeQuerySchema, 'query'), transportController.getRoutes)
  .post(
    authorize(...writeRoles),
    validate(routeCreateSchema, 'body'),
    transportController.createRoute
  );

router
  .route('/routes/:id')
  .get(authorize(...readRoles), validate(objectIdParamSchema, 'params'), transportController.getRoute)
  .put(
    authorize(...writeRoles),
    validate(objectIdParamSchema, 'params'),
    validate(routeUpdateSchema, 'body'),
    transportController.updateRoute
  )
  .delete(
    authorize(...writeRoles),
    validate(objectIdParamSchema, 'params'),
    transportController.deleteRoute
  );

// Route-level student assignment convenience actions
router.post(
  '/routes/:id/assign-student',
  authorize(...writeRoles),
  validate(objectIdParamSchema, 'params'),
  validate(assignStudentSchema, 'body'),
  transportController.assignStudent
);

router.post(
  '/routes/:id/remove-student',
  authorize(...writeRoles),
  validate(objectIdParamSchema, 'params'),
  validate(removeStudentSchema, 'body'),
  transportController.removeStudent
);

// ── Student Transport Allocations ────────────────────────────
router
  .route('/allocations')
  .get(authorize(...readRoles), validate(allocationQuerySchema, 'query'), transportController.getAllocations)
  .post(
    authorize(...writeRoles),
    validate(allocationCreateSchema, 'body'),
    transportController.createAllocation
  );

router
  .route('/allocations/:id')
  .get(authorize(...readRoles), validate(objectIdParamSchema, 'params'), transportController.getAllocation)
  .put(
    authorize(...writeRoles),
    validate(objectIdParamSchema, 'params'),
    validate(allocationUpdateSchema, 'body'),
    transportController.updateAllocation
  )
  .delete(
    authorize(...writeRoles),
    validate(objectIdParamSchema, 'params'),
    transportController.deleteAllocation
  );

module.exports = router;
