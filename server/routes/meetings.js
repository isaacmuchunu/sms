const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', meetingController.getMeetings);
router.get('/:id', meetingController.getMeeting);
router.post('/', authorize('admin', 'teacher'), meetingController.createMeeting);
router.patch('/:id', authorize('admin', 'teacher'), meetingController.updateMeeting);
router.delete('/:id', authorize('admin', 'teacher'), meetingController.deleteMeeting);

module.exports = router;
