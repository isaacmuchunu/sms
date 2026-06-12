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
  .post(authorize('admin'), hostelController.createRoom);

router.put('/rooms/:id', authorize('admin'), hostelController.updateRoom);

// Room allocation management
router.post('/rooms/:id/allocate', authorize('admin'), hostelController.allocateRoom);
router.post('/rooms/:id/vacate', authorize('admin'), hostelController.vacateRoom);

// ── Visitor Logs ───────────────────────────────────────────
router
  .route('/visitor-logs')
  .get(hostelController.getVisitorLogs)
  .post(hostelController.addVisitor);

router.put('/visitor-logs/:id/checkout', hostelController.checkoutVisitor);

module.exports = router;
