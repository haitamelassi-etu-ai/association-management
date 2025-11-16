const Attendance = require('../models/Attendance');

// @desc    Check in
// @route   POST /api/attendance/checkin
// @access  Private
exports.checkIn = async (req, res) => {
  try {
    const { location, notes } = req.body;
    
    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingAttendance = await Attendance.findOne({
      user: req.user._id,
      date: { $gte: today }
    });
    
    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà pointé aujourd\'hui'
      });
    }
    
    const attendance = await Attendance.create({
      user: req.user._id,
      checkIn: new Date(),
      location: location || undefined,
      notes
    });
    
    res.status(201).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Check out
// @route   PUT /api/attendance/checkout/:id
// @access  Private
exports.checkOut = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Pointage non trouvé'
      });
    }
    
    if (attendance.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }
    
    attendance.checkOut = new Date();
    await attendance.save();
    
    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get my attendance
// @route   GET /api/attendance/me
// @access  Private
exports.getMyAttendance = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    let query = { user: req.user._id };
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    const attendance = await Attendance.find(query).sort({ date: -1 });
    
    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all attendance (Admin)
// @route   GET /api/attendance
// @access  Private/Admin
exports.getAllAttendance = async (req, res) => {
  try {
    const { date, user } = req.query;
    
    let query = {};
    
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      query.date = { $gte: targetDate };
    }
    
    if (user) {
      query.user = user;
    }
    
    const attendance = await Attendance.find(query)
      .populate('user', 'nom prenom email')
      .sort({ date: -1 });
    
    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
