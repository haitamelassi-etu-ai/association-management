const express = require('express');
const router = express.Router();
const {
  checkIn,
  checkOut,
  getMyAttendance,
  getAllAttendance
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

router.post('/checkin', protect, checkIn);
router.put('/checkout/:id', protect, checkOut);
router.get('/me', protect, getMyAttendance);
router.get('/', protect, authorize('admin', 'staff'), getAllAttendance);

module.exports = router;
