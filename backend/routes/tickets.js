const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const { createNotification } = require('../utils/notificationHelper');

// @route   GET /api/tickets
// @desc    Get all tickets
// @access  Protected
router.get('/', protect, async (req, res) => {
  try {
    const { status, priority, category, page = 1, limit = 20 } = req.query;

    const query = {};

    // Non-admins see only their tickets or assigned to them
    if (req.user.role !== 'admin' && req.user.role !== 'responsable') {
      query.$or = [
        { createdBy: req.user._id },
        { assignedTo: req.user._id }
      ];
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;

    const tickets = await Ticket.find(query)
      .populate('createdBy', 'nom prenom email')
      .populate('assignedTo', 'nom prenom email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Ticket.countDocuments(query);

    res.json({
      success: true,
      data: tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tickets'
    });
  }
});

// @route   POST /api/tickets
// @desc    Create a new ticket
// @access  Protected
router.post('/', protect, async (req, res) => {
  try {
    const ticketData = {
      ...req.body,
      createdBy: req.user._id,
      messages: [{
        sender: req.user._id,
        content: req.body.description,
        createdAt: new Date()
      }]
    };

    const ticket = await Ticket.create(ticketData);

    await logAudit({
      user: req.user,
      action: 'create',
      resource: 'ticket',
      resourceId: ticket._id,
      details: { title: ticket.title, category: ticket.category },
      req
    });

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('createdBy', 'nom prenom email')
      .populate('assignedTo', 'nom prenom email');

    res.status(201).json({
      success: true,
      data: populatedTicket
    });
  } catch (error) {
    console.error('❌ Error creating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du ticket'
    });
  }
});

// @route   GET /api/tickets/:id
// @desc    Get single ticket
// @access  Protected
router.get('/:id', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('createdBy', 'nom prenom email role')
      .populate('assignedTo', 'nom prenom email')
      .populate('messages.sender', 'nom prenom role')
      .populate('relatedBeneficiary', 'nom prenom');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('❌ Error fetching ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du ticket'
    });
  }
});

// @route   POST /api/tickets/:id/messages
// @desc    Add message to ticket
// @access  Protected
router.post('/:id/messages', protect, async (req, res) => {
  try {
    const { content, isInternal } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    ticket.messages.push({
      sender: req.user._id,
      content,
      isInternal: isInternal || false,
      createdAt: new Date()
    });

    // Update status if needed
    if (ticket.status === 'open') {
      ticket.status = 'in-progress';
    }

    await ticket.save();

    // Notify other party
    const notifyUser = ticket.createdBy.toString() === req.user._id.toString()
      ? ticket.assignedTo
      : ticket.createdBy;

    if (notifyUser && !isInternal) {
      await createNotification({
        userId: notifyUser,
        title: `Nouvelle réponse - ${ticket.ticketNumber}`,
        message: `${req.user.prenom} ${req.user.nom} a répondu à votre ticket`,
        type: 'info',
        link: `/professional/tickets/${ticket._id}`
      });
    }

    const updatedTicket = await Ticket.findById(req.params.id)
      .populate('messages.sender', 'nom prenom role');

    res.json({
      success: true,
      data: updatedTicket
    });
  } catch (error) {
    console.error('❌ Error adding message:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout du message'
    });
  }
});

// @route   PATCH /api/tickets/:id/status
// @desc    Update ticket status
// @access  Protected
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status, resolution } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    const previousStatus = ticket.status;
    ticket.status = status;

    if (status === 'resolved') {
      ticket.resolvedAt = new Date();
      ticket.resolution = resolution;
    } else if (status === 'closed') {
      ticket.closedAt = new Date();
    }

    await ticket.save();

    // Notify creator
    if (ticket.createdBy.toString() !== req.user._id.toString()) {
      await createNotification({
        userId: ticket.createdBy,
        title: `Ticket ${ticket.ticketNumber} - Statut mis à jour`,
        message: `Le statut de votre ticket est maintenant: ${status}`,
        type: 'info',
        link: `/professional/tickets/${ticket._id}`
      });
    }

    await logAudit({
      user: req.user,
      action: 'status_change',
      resource: 'ticket',
      resourceId: ticket._id,
      previousValues: { status: previousStatus },
      newValues: { status },
      req
    });

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('❌ Error updating ticket status:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut'
    });
  }
});

// @route   PATCH /api/tickets/:id/assign
// @desc    Assign ticket to user
// @access  Admin, Responsable
router.patch('/:id/assign', protect, authorize('admin', 'responsable'), async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    ticket.assignedTo = assignedTo;
    await ticket.save();

    // Notify assigned user
    await createNotification({
      userId: assignedTo,
      title: `Nouveau ticket assigné - ${ticket.ticketNumber}`,
      message: `Un ticket vous a été assigné: ${ticket.title}`,
      type: 'info',
      link: `/professional/tickets/${ticket._id}`
    });

    const updatedTicket = await Ticket.findById(req.params.id)
      .populate('assignedTo', 'nom prenom email');

    res.json({
      success: true,
      data: updatedTicket
    });
  } catch (error) {
    console.error('❌ Error assigning ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'assignation'
    });
  }
});

// @route   GET /api/tickets/stats/summary
// @desc    Get ticket statistics
// @access  Admin, Responsable
router.get('/stats/summary', protect, authorize('admin', 'responsable'), async (req, res) => {
  try {
    const [statusStats, priorityStats, categoryStats, openCount] = await Promise.all([
      Ticket.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Ticket.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      Ticket.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Ticket.countDocuments({ status: { $in: ['open', 'in-progress'] } })
    ]);

    res.json({
      success: true,
      data: {
        statusStats,
        priorityStats,
        categoryStats,
        openCount
      }
    });
  } catch (error) {
    console.error('❌ Error fetching ticket stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
});

module.exports = router;
