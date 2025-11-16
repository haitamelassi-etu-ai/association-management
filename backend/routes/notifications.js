const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// @desc    Get notifications for logged-in user
// @route   GET /api/notifications
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { unreadOnly, limit = 50 } = req.query;
    
    const query = { recipient: req.user.id };
    
    if (unreadOnly === 'true') {
      query.isRead = false;
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('createdBy', 'nom prenom');
    
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false
    });
    
    res.json({
      success: true,
      data: notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des notifications',
      error: error.message
    });
  }
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification non trouvée'
      });
    }
    
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
    
    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour',
      error: error.message
    });
  }
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    res.json({
      success: true,
      message: 'Toutes les notifications marquées comme lues'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour',
      error: error.message
    });
  }
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification non trouvée'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification supprimée'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression',
      error: error.message
    });
  }
});

// @desc    Create notification (Admin/Manager only)
// @route   POST /api/notifications
// @access  Private (Admin, Manager)
router.post('/', protect, async (req, res) => {
  try {
    const { recipient, type, title, message, icon, link, metadata } = req.body;
    
    // If recipient is 'all', create notification for all users
    let recipients = [];
    
    if (recipient === 'all') {
      const User = require('../models/User');
      const allUsers = await User.find({ statut: 'actif' }).select('_id');
      recipients = allUsers.map(u => u._id);
    } else {
      recipients = Array.isArray(recipient) ? recipient : [recipient];
    }
    
    // Create notifications
    const notifications = recipients.map(recipientId => ({
      recipient: recipientId,
      type: type || 'info',
      title,
      message,
      icon: icon || '🔔',
      link,
      metadata,
      createdBy: req.user.id
    }));
    
    const created = await Notification.insertMany(notifications);
    
    res.status(201).json({
      success: true,
      message: `${created.length} notification(s) créée(s)`,
      data: created
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création',
      error: error.message
    });
  }
});

// @desc    Get unread count
// @route   GET /api/notifications/unread/count
// @access  Private
router.get('/unread/count', protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false
    });
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération',
      error: error.message
    });
  }
});

module.exports = router;
