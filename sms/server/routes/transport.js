const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transportController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes are protected
router.use(authenticate);

// ── Routes ─────────────────────────────────────────────────
router
  .route('/routes')
  .get(transportController.getRoutes)
  .post(authorize('admin', 'transport_manager'), transportController.createRoute);

router
  .route('/routes/:id')
  .put(authorize('admin', 'transport_manager'), transportController.updateRoute)
  .delete(authorize('admin', 'transport_manager'), transportController.deleteRoute);

// Student management on routes
router.post('/routes/:id/assign-student', authorize('admin', 'transport_manager'), transportController.assignStudent);
router.post('/routes/:id/remove-student', authorize('admin', 'transport_manager'), transportController.removeStudent);

// ── Vehicles ───────────────────────────────────────────────
router
  .route('/vehicles')
  .get(transportController.getVehicles)
  .post(authorize('admin', 'transport_manager'), transportController.addVehicle);

router.put('/vehicles/:id', authorize('admin', 'transport_manager'), transportController.updateVehicle);

module.exports = router;
