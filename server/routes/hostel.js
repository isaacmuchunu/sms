const express = require('express');
const router = express.Router();
const { authenticate, authorize, requireModule } = require('../middleware/auth');
const validate = require('../middleware/validate');
const hostelController = require('../controllers/hostelController');
const {
  idParamSchema,
  createHostelSchema,
  updateHostelSchema,
  listHostelsQuerySchema,
  createRoomSchema,
  updateRoomSchema,
  listRoomsQuerySchema,
  allocateRoomSchema,
  vacateRoomSchema,
  createAllocationSchema,
  updateAllocationSchema,
  listAllocationsQuerySchema,
  createVisitorLogSchema,
  updateVisitorLogSchema,
  approveVisitorSchema,
  checkoutVisitorSchema,
  listVisitorLogsQuerySchema,
} = require('../validators/hostel');

const requireAdminOrWarden = authorize('admin', 'warden');

router.use(authenticate, requireModule('hostel'));

// ── Hostels ─────────────────────────────────────────────────
router
  .route('/hostels')
  .get(requireAdminOrWarden, validate(listHostelsQuerySchema, 'query'), hostelController.getHostels)
  .post(requireAdminOrWarden, validate(createHostelSchema), hostelController.createHostel);

router
  .route('/hostels/:id')
  .get(requireAdminOrWarden, validate(idParamSchema, 'params'), hostelController.getHostel)
  .put(
    requireAdminOrWarden,
    validate(idParamSchema, 'params'),
    validate(updateHostelSchema),
    hostelController.updateHostel
  )
  .delete(requireAdminOrWarden, validate(idParamSchema, 'params'), hostelController.deleteHostel);

// ── Rooms ───────────────────────────────────────────────────
router
  .route('/rooms')
  .get(requireAdminOrWarden, validate(listRoomsQuerySchema, 'query'), hostelController.getRooms)
  .post(requireAdminOrWarden, validate(createRoomSchema), hostelController.createRoom);

router
  .route('/rooms/:id')
  .get(requireAdminOrWarden, validate(idParamSchema, 'params'), hostelController.getRoom)
  .put(
    requireAdminOrWarden,
    validate(idParamSchema, 'params'),
    validate(updateRoomSchema),
    hostelController.updateRoom
  )
  .delete(requireAdminOrWarden, validate(idParamSchema, 'params'), hostelController.deleteRoom);

router.post(
  '/rooms/:id/allocate',
  requireAdminOrWarden,
  validate(idParamSchema, 'params'),
  validate(allocateRoomSchema),
  hostelController.allocateRoom
);

router.post(
  '/rooms/:id/vacate',
  requireAdminOrWarden,
  validate(idParamSchema, 'params'),
  validate(vacateRoomSchema),
  hostelController.vacateRoom
);

// ── Allocations ─────────────────────────────────────────────
router
  .route('/allocations')
  .get(
    requireAdminOrWarden,
    validate(listAllocationsQuerySchema, 'query'),
    hostelController.getAllocations
  )
  .post(requireAdminOrWarden, validate(createAllocationSchema), hostelController.createAllocation);

router
  .route('/allocations/:id')
  .get(requireAdminOrWarden, validate(idParamSchema, 'params'), hostelController.getAllocation)
  .put(
    requireAdminOrWarden,
    validate(idParamSchema, 'params'),
    validate(updateAllocationSchema),
    hostelController.updateAllocation
  );

router.post(
  '/allocations/:id/vacate',
  requireAdminOrWarden,
  validate(idParamSchema, 'params'),
  hostelController.vacateAllocation
);

// ── Visitor Logs ────────────────────────────────────────────
router
  .route('/visitor-logs')
  .get(
    requireAdminOrWarden,
    validate(listVisitorLogsQuerySchema, 'query'),
    hostelController.getVisitorLogs
  )
  .post(requireAdminOrWarden, validate(createVisitorLogSchema), hostelController.addVisitor);

router
  .route('/visitor-logs/:id')
  .get(requireAdminOrWarden, validate(idParamSchema, 'params'), hostelController.getVisitorLog)
  .put(
    requireAdminOrWarden,
    validate(idParamSchema, 'params'),
    validate(updateVisitorLogSchema),
    hostelController.updateVisitor
  );

router.put(
  '/visitor-logs/:id/checkout',
  requireAdminOrWarden,
  validate(idParamSchema, 'params'),
  validate(checkoutVisitorSchema),
  hostelController.checkoutVisitor
);

router.put(
  '/visitor-logs/:id/approve',
  requireAdminOrWarden,
  validate(idParamSchema, 'params'),
  validate(approveVisitorSchema),
  hostelController.approveVisitor
);

module.exports = router;
