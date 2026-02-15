const express = require('express');
const router = express.Router();
const ApprovalRequest = require('../models/ApprovalRequest');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const { createNotification } = require('../utils/notificationHelper');

// @route   GET /api/approvals
// @desc    Get approval requests
// @access  Protected
router.get('/', protect, async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;

    const query = {};

    // Admin sees all, others see their own or assigned to them
    if (req.user.role !== 'admin') {
      query.$or = [
        { requestedBy: req.user._id },
        { assignedTo: req.user._id }
      ];
    }

    if (status) query.status = status;
    if (type) query.type = type;

    const requests = await ApprovalRequest.find(query)
      .populate('requestedBy', 'nom prenom email role')
      .populate('assignedTo', 'nom prenom email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ApprovalRequest.countDocuments(query);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching approvals:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des demandes'
    });
  }
});

// @route   POST /api/approvals
// @desc    Create a new approval request
// @access  Protected
router.post('/', protect, async (req, res) => {
  try {
    const requestData = {
      ...req.body,
      requestedBy: req.user._id,
      approvalHistory: [{
        action: 'submitted',
        by: req.user._id,
        timestamp: new Date()
      }]
    };

    const request = await ApprovalRequest.create(requestData);

    // Notify assigned user or admins
    if (request.assignedTo) {
      await createNotification({
        userId: request.assignedTo,
        title: 'Nouvelle demande d\'approbation',
        message: `${req.user.prenom} ${req.user.nom} a soumis une demande: ${request.title}`,
        type: 'approval',
        link: `/professional/approvals/${request._id}`
      });
    }

    await logAudit({
      user: req.user,
      action: 'create',
      resource: 'approval',
      resourceId: request._id,
      details: { type: request.type, title: request.title },
      req
    });

    const populatedRequest = await ApprovalRequest.findById(request._id)
      .populate('requestedBy', 'nom prenom email')
      .populate('assignedTo', 'nom prenom email');

    res.status(201).json({
      success: true,
      data: populatedRequest
    });
  } catch (error) {
    console.error('❌ Error creating approval:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la demande'
    });
  }
});

// @route   GET /api/approvals/:id
// @desc    Get single approval request
// @access  Protected
router.get('/:id', protect, async (req, res) => {
  try {
    const request = await ApprovalRequest.findById(req.params.id)
      .populate('requestedBy', 'nom prenom email role')
      .populate('assignedTo', 'nom prenom email')
      .populate('approvalHistory.by', 'nom prenom')
      .populate('comments.user', 'nom prenom');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('❌ Error fetching approval:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la demande'
    });
  }
});

// @route   PATCH /api/approvals/:id/approve
// @desc    Approve a request
// @access  Admin, Responsable
router.patch('/:id/approve', protect, authorize('admin', 'responsable'), async (req, res) => {
  try {
    const { comment } = req.body;
    const request = await ApprovalRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cette demande a déjà été traitée'
      });
    }

    request.status = 'approved';
    request.completedAt = new Date();
    request.approvalHistory.push({
      action: 'approved',
      by: req.user._id,
      comment,
      timestamp: new Date()
    });

    await request.save();

    // Notify requester
    await createNotification({
      userId: request.requestedBy,
      title: 'Demande approuvée',
      message: `Votre demande "${request.title}" a été approuvée`,
      type: 'success',
      link: `/professional/approvals/${request._id}`
    });

    await logAudit({
      user: req.user,
      action: 'approval',
      resource: 'approval',
      resourceId: request._id,
      details: { title: request.title, comment },
      req
    });

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('❌ Error approving request:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'approbation'
    });
  }
});

// @route   PATCH /api/approvals/:id/reject
// @desc    Reject a request
// @access  Admin, Responsable
router.patch('/:id/reject', protect, authorize('admin', 'responsable'), async (req, res) => {
  try {
    const { comment } = req.body;
    const request = await ApprovalRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cette demande a déjà été traitée'
      });
    }

    request.status = 'rejected';
    request.completedAt = new Date();
    request.approvalHistory.push({
      action: 'rejected',
      by: req.user._id,
      comment,
      timestamp: new Date()
    });

    await request.save();

    // Notify requester
    await createNotification({
      userId: request.requestedBy,
      title: 'Demande rejetée',
      message: `Votre demande "${request.title}" a été rejetée`,
      type: 'warning',
      link: `/professional/approvals/${request._id}`
    });

    await logAudit({
      user: req.user,
      action: 'rejection',
      resource: 'approval',
      resourceId: request._id,
      details: { title: request.title, comment },
      req
    });

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('❌ Error rejecting request:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du rejet'
    });
  }
});

// @route   POST /api/approvals/:id/comment
// @desc    Add comment to approval request
// @access  Protected
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const { text } = req.body;
    const request = await ApprovalRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    request.comments.push({
      user: req.user._id,
      text,
      timestamp: new Date()
    });

    await request.save();

    const updatedRequest = await ApprovalRequest.findById(req.params.id)
      .populate('comments.user', 'nom prenom');

    res.json({
      success: true,
      data: updatedRequest
    });
  } catch (error) {
    console.error('❌ Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout du commentaire'
    });
  }
});

// @route   GET /api/approvals/stats
// @desc    Get approval statistics
// @access  Admin
router.get('/stats/summary', protect, authorize('admin', 'responsable'), async (req, res) => {
  try {
    const [statusStats, typeStats, pendingCount] = await Promise.all([
      ApprovalRequest.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      ApprovalRequest.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      ApprovalRequest.countDocuments({ status: 'pending' })
    ]);

    res.json({
      success: true,
      data: {
        statusStats,
        typeStats,
        pendingCount
      }
    });
  } catch (error) {
    console.error('❌ Error fetching approval stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
});

module.exports = router;
