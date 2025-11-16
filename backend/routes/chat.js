const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Get all conversations for current user
router.get('/conversations', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all messages where user is sender or receiver
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user._id },
            { receiver: req.user._id }
          ],
          'metadata.deleted': { $ne: true }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', req.user._id] },
              '$receiver',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', req.user._id] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'participant'
        }
      },
      {
        $unwind: '$participant'
      },
      {
        $project: {
          participant: {
            _id: 1,
            name: 1,
            email: 1,
            role: 1,
            avatar: 1
          },
          lastMessage: {
            content: 1,
            createdAt: 1,
            isRead: 1,
            type: 1
          },
          unreadCount: 1
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des conversations' });
  }
});

// Get messages between current user and another user
router.get('/messages/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ],
      'metadata.deleted': { $ne: true }
    })
      .populate('sender', 'name email role avatar')
      .populate('receiver', 'name email role avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await Message.countDocuments({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ],
      'metadata.deleted': { $ne: true }
    });
    
    res.json({
      messages: messages.reverse(),
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des messages' });
  }
});

// Mark messages as read
router.put('/messages/read/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await Message.updateMany(
      {
        sender: userId,
        receiver: req.user._id,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );
    
    res.json({ 
      message: 'Messages marqués comme lus',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour des messages' });
  }
});

// Get unread message count
router.get('/unread/count', protect, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user._id,
      isRead: false,
      'metadata.deleted': { $ne: true }
    });
    
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Erreur lors du comptage des messages non lus' });
  }
});

// Search users for chat (exclude current user)
router.get('/users/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    
    const query = {
      _id: { $ne: req.user._id },
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    };
    
    const users = await User.find(query)
      .select('name email role avatar')
      .limit(10);
    
    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Erreur lors de la recherche des utilisateurs' });
  }
});

// Delete message (soft delete)
router.delete('/messages/:messageId', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findOne({
      _id: messageId,
      sender: req.user._id
    });
    
    if (!message) {
      return res.status(404).json({ message: 'Message non trouvé' });
    }
    
    message.metadata.deleted = true;
    message.metadata.deletedAt = new Date();
    await message.save();
    
    res.json({ message: 'Message supprimé' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du message' });
  }
});

// Get all staff members for chat
router.get('/staff', protect, async (req, res) => {
  try {
    const staff = await User.find({
      _id: { $ne: req.user._id },
      role: { $in: ['admin', 'staff'] }
    })
      .select('name email role avatar')
      .sort({ name: 1 });
    
    res.json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du personnel' });
  }
});

module.exports = router;
