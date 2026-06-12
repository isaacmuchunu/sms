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
  .post(authorize('admin'), transportController.createRoute);

router
  .route('/routes/:id')
  .put(authorize('admin'), transportController.updateRoute)
  .delete(authorize('admin'), transportController.deleteRoute);

// Student management on routes
router.post('/routes/:id/assign-student', authorize('admin'), transportController.assignStudent);
router.post('/routes/:id/remove-student', authorize('admin'), transportController.removeStudent);

// ── Vehicles ───────────────────────────────────────────────
router
  .route('/vehicles')
  .get(transportController.getVehicles)
  .post(authorize('admin'), transportController.addVehicle);

router.put('/vehicles/:id', authorize('admin'), transportController.updateVehicle);

module.exports = router;
