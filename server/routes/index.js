const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/schools', require('./schools'));
router.use('/students', require('./students'));
router.use('/teachers', require('./teachers'));
router.use('/academic-years', require('./academicYears'));
router.use('/classes', require('./classes'));
router.use('/subjects', require('./subjects'));
router.use('/timetables', require('./timetables'));
router.use('/attendance', require('./attendance'));
router.use('/exams', require('./exams'));
router.use('/fees', require('./fees'));
router.use('/library', require('./library'));
router.use('/transport', require('./transport'));
router.use('/hostel', require('./hostel'));
router.use('/reports', require('./reports'));
router.use('/announcements', require('./announcements'));
router.use('/notifications', require('./notifications'));
router.use('/meetings', require('./meetings'));
router.use('/settings', require('./settings'));
router.use('/communications', require('./communications'));
router.use('/sessions', require('./sessions'));
router.use('/payments', require('./payments'));
router.use('/module-requests', require('./moduleRequests'));

module.exports = router;
