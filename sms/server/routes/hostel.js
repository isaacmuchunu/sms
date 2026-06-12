const express = require('express');
const router = express.Router();
const hostelController = require('../controllers/hostelController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes are protected
router.use(authenticate);

// ── Rooms ──────────────────────────────────────────────────
router
  .route('/rooms')
  .get(hostelController.getRooms)
  .post(authorize('admin', 'warden'), hostelController.createRoom);

router.put('/rooms/:id', authorize('admin', 'warden'), hostelController.updateRoom);

// Room allocation management
router.post('/rooms/:id/allocate', authorize('admin', 'warden'), hostelController.allocateRoom);
router.post('/rooms/:id/vacate', authorize('admin', 'warden'), hostelController.vacateRoom);

// ── Visitor Logs ───────────────────────────────────────────
router
  .route('/visitor-logs')
  .get(authorize('admin', 'warden'), hostelController.getVisitorLogs)
  .post(authorize('admin', 'warden'), hostelController.addVisitor);

router.put('/visitor-logs/:id/checkout', authorize('admin', 'warden'), hostelController.checkoutVisitor);

module.exports = router;
