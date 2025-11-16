const express = require('express');
const router = express.Router();
const Beneficiary = require('../models/Beneficiary');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

// Export all data as JSON backup
router.get('/export/all', protect, authorize('admin'), async (req, res) => {
  try {
    const [beneficiaries, users, attendance, messages, notifications] = await Promise.all([
      Beneficiary.find().populate('responsable', 'name email'),
      User.find().select('-password'),
      Attendance.find().populate('user', 'name email'),
      Message.find().populate('sender receiver', 'name email'),
      Notification.find().populate('recipient createdBy', 'name email')
    ]);

    const backup = {
      exportDate: new Date(),
      exportedBy: req.user.email,
      version: '1.0',
      data: {
        beneficiaries,
        users,
        attendance,
        messages,
        notifications
      },
      statistics: {
        totalBeneficiaries: beneficiaries.length,
        totalUsers: users.length,
        totalAttendance: attendance.length,
        totalMessages: messages.length,
        totalNotifications: notifications.length
      }
    };

    res.json({
      success: true,
      message: 'Backup créé avec succès',
      backup
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du backup'
    });
  }
});

// Export beneficiaries only
router.get('/export/beneficiaries', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const beneficiaries = await Beneficiary.find()
      .populate('responsable', 'name email')
      .sort({ createdAt: -1 });

    const backup = {
      exportDate: new Date(),
      exportedBy: req.user.email,
      type: 'beneficiaries',
      data: beneficiaries,
      count: beneficiaries.length
    };

    res.json({
      success: true,
      message: 'Export des bénéficiaires réussi',
      backup
    });
  } catch (error) {
    console.error('Error exporting beneficiaries:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'export des bénéficiaires'
    });
  }
});

// Export users only (admin only)
router.get('/export/users', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    const backup = {
      exportDate: new Date(),
      exportedBy: req.user.email,
      type: 'users',
      data: users,
      count: users.length
    };

    res.json({
      success: true,
      message: 'Export des utilisateurs réussi',
      backup
    });
  } catch (error) {
    console.error('Error exporting users:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'export des utilisateurs'
    });
  }
});

// Export attendance records
router.get('/export/attendance', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = {};
    if (startDate && endDate) {
      query.checkIn = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .populate('user', 'name email')
      .sort({ checkIn: -1 });

    const backup = {
      exportDate: new Date(),
      exportedBy: req.user.email,
      type: 'attendance',
      dateRange: { startDate, endDate },
      data: attendance,
      count: attendance.length
    };

    res.json({
      success: true,
      message: 'Export des présences réussi',
      backup
    });
  } catch (error) {
    console.error('Error exporting attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'export des présences'
    });
  }
});

// Get backup history/statistics
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const stats = {
      beneficiaries: await Beneficiary.countDocuments(),
      users: await User.countDocuments(),
      attendance: await Attendance.countDocuments(),
      messages: await Message.countDocuments(),
      notifications: await Notification.countDocuments(),
      lastBackup: new Date(),
      databaseSize: 'N/A' // Would need additional logic
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting backup stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
});

module.exports = router;
