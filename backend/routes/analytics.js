const express = require('express');
const router = express.Router();
const Beneficiary = require('../models/Beneficiary');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private (Admin, Manager, Staff)
router.get('/dashboard', protect, authorize('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total beneficiaries
    const totalBeneficiaries = await Beneficiary.countDocuments();
    
    // Active beneficiaries (not exited)
    const activeBeneficiaries = await Beneficiary.countDocuments({
      statut: { $in: ['actif', 'en_attente'] }
    });
    
    // Exited beneficiaries
    const exitedBeneficiaries = await Beneficiary.countDocuments({
      statut: 'sorti'
    });
    
    // New beneficiaries this month
    const newThisMonth = await Beneficiary.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    
    // New beneficiaries last month
    const newLastMonth = await Beneficiary.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lt: startOfMonth }
    });
    
    // Beneficiaries by age groups
    const beneficiariesByAge = await Beneficiary.aggregate([
      {
        $addFields: {
          ageGroup: {
            $switch: {
              branches: [
                { case: { $lt: ['$age', 18] }, then: '0-17' },
                { case: { $and: [{ $gte: ['$age', 18] }, { $lt: ['$age', 30] }] }, then: '18-29' },
                { case: { $and: [{ $gte: ['$age', 30] }, { $lt: ['$age', 50] }] }, then: '30-49' },
                { case: { $and: [{ $gte: ['$age', 50] }, { $lt: ['$age', 65] }] }, then: '50-64' },
              ],
              default: '65+'
            }
          }
        }
      },
      {
        $group: {
          _id: '$ageGroup',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Monthly statistics for the last 6 months
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthlyStats = await Beneficiary.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Format monthly stats
    const formattedMonthlyStats = monthlyStats.map(stat => ({
      month: `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}`,
      count: stat.count
    }));
    
    // Staff statistics
    const totalStaff = await User.countDocuments({ role: 'staff' });
    const activeStaff = await User.countDocuments({ 
      role: 'staff',
      statut: 'actif'
    });
    
    // Today's attendance
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));
    const todayAttendance = await Attendance.countDocuments({
      checkIn: { $gte: todayStart, $lte: todayEnd }
    });
    
    // Success rate (beneficiaries who exited successfully vs total exited)
    const successfulExits = await Beneficiary.countDocuments({
      statut: 'sorti',
      typeDepart: 'réinsertion'
    });
    const successRate = exitedBeneficiaries > 0 
      ? ((successfulExits / exitedBeneficiaries) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        beneficiaries: {
          total: totalBeneficiaries,
          active: activeBeneficiaries,
          exited: exitedBeneficiaries,
          newThisMonth,
          newLastMonth,
          growthRate: newLastMonth > 0 
            ? (((newThisMonth - newLastMonth) / newLastMonth) * 100).toFixed(1)
            : 0,
          byAge: beneficiariesByAge,
          monthlyStats: formattedMonthlyStats,
          successRate: parseFloat(successRate)
        },
        staff: {
          total: totalStaff,
          active: activeStaff,
          todayAttendance
        }
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

// @desc    Get beneficiary statistics by status
// @route   GET /api/analytics/beneficiaries/status
// @access  Private (Admin, Manager, Staff)
router.get('/beneficiaries/status', protect, authorize('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const statusStats = await Beneficiary.aggregate([
      {
        $group: {
          _id: '$statut',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: statusStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

// @desc    Get attendance statistics
// @route   GET /api/analytics/attendance
// @access  Private (Admin, Manager, Staff)
router.get('/attendance', protect, authorize('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          checkIn: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$checkIn' }
          },
          count: { $sum: 1 },
          avgDuration: {
            $avg: {
              $cond: [
                { $ne: ['$checkOut', null] },
                { $subtract: ['$checkOut', '$checkIn'] },
                0
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Convert duration from milliseconds to hours
    const formattedStats = attendanceStats.map(stat => ({
      date: stat._id,
      count: stat.count,
      avgHours: stat.avgDuration > 0 ? (stat.avgDuration / (1000 * 60 * 60)).toFixed(2) : 0
    }));

    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

module.exports = router;
