const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/audit-logs
// @desc    Get audit logs with filters
// @access  Admin only
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      resource,
      userId,
      startDate,
      endDate,
      search
    } = req.query;

    const query = {};

    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (userId) query.user = userId;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .populate('user', 'nom prenom email role')
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des logs'
    });
  }
});

// @route   GET /api/audit-logs/stats
// @desc    Get audit log statistics
// @access  Admin only
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const [actionStats, resourceStats, dailyStats, userStats] = await Promise.all([
      // Actions distribution
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      // Resources distribution
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: '$resource', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      // Daily activity
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      // Most active users
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: '$user', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userInfo'
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        actionStats,
        resourceStats,
        dailyStats,
        userStats: userStats.map(u => ({
          ...u,
          user: u.userInfo[0] ? {
            nom: u.userInfo[0].nom,
            prenom: u.userInfo[0].prenom,
            email: u.userInfo[0].email
          } : null
        }))
      }
    });
  } catch (error) {
    console.error('❌ Error fetching audit stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
});

// @route   GET /api/audit-logs/user/:userId
// @desc    Get audit logs for a specific user
// @access  Admin only
router.get('/user/:userId', protect, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const logs = await AuditLog.find({ user: req.params.userId })
      .populate('user', 'nom prenom email role')
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments({ user: req.params.userId });

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching user audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des logs'
    });
  }
});

// @route   GET /api/audit-logs/resource/:resource/:resourceId
// @desc    Get audit logs for a specific resource
// @access  Admin, Staff
router.get('/resource/:resource/:resourceId', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const logs = await AuditLog.find({
      resource: req.params.resource,
      resourceId: req.params.resourceId
    })
      .populate('user', 'nom prenom email role')
      .sort({ timestamp: -1 });

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('❌ Error fetching resource audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des logs'
    });
  }
});

module.exports = router;
