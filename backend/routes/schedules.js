const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

// @route   GET /api/schedules
// @desc    Get all schedules with filters
// @access  Protected
router.get('/', protect, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      type,
      status,
      assignedTo,
      beneficiary
    } = req.query;

    const query = {};

    if (startDate && endDate) {
      query.$or = [
        { startDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { endDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        {
          startDate: { $lte: new Date(startDate) },
          endDate: { $gte: new Date(endDate) }
        }
      ];
    }

    if (type) query.type = type;
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;
    if (beneficiary) query.beneficiary = beneficiary;

    // Non-admins can only see their own schedules or schedules they're assigned to
    if (req.user.role !== 'admin') {
      query.$or = [
        { createdBy: req.user._id },
        { assignedTo: req.user._id }
      ];
    }

    const schedules = await Schedule.find(query)
      .populate('assignedTo', 'nom prenom email')
      .populate('beneficiary', 'nom prenom')
      .populate('createdBy', 'nom prenom')
      .sort({ startDate: 1 });

    res.json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    console.error('❌ Error fetching schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des plannings'
    });
  }
});

// @route   POST /api/schedules
// @desc    Create a new schedule
// @access  Protected
router.post('/', protect, async (req, res) => {
  try {
    const scheduleData = {
      ...req.body,
      createdBy: req.user._id
    };

    const schedule = await Schedule.create(scheduleData);

    await logAudit({
      user: req.user,
      action: 'create',
      resource: 'schedule',
      resourceId: schedule._id,
      details: { title: schedule.title, type: schedule.type },
      req
    });

    const populatedSchedule = await Schedule.findById(schedule._id)
      .populate('assignedTo', 'nom prenom email')
      .populate('beneficiary', 'nom prenom')
      .populate('createdBy', 'nom prenom');

    res.status(201).json({
      success: true,
      data: populatedSchedule
    });
  } catch (error) {
    console.error('❌ Error creating schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du planning'
    });
  }
});

// @route   PUT /api/schedules/:id
// @desc    Update a schedule
// @access  Protected
router.put('/:id', protect, async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Planning non trouvé'
      });
    }

    // Check permission
    if (req.user.role !== 'admin' && 
        schedule.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à modifier ce planning'
      });
    }

    const previousValues = schedule.toObject();
    const updatedSchedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'nom prenom email')
      .populate('beneficiary', 'nom prenom')
      .populate('createdBy', 'nom prenom');

    await logAudit({
      user: req.user,
      action: 'update',
      resource: 'schedule',
      resourceId: schedule._id,
      previousValues,
      newValues: req.body,
      req
    });

    res.json({
      success: true,
      data: updatedSchedule
    });
  } catch (error) {
    console.error('❌ Error updating schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du planning'
    });
  }
});

// @route   DELETE /api/schedules/:id
// @desc    Delete a schedule
// @access  Admin, Creator
router.delete('/:id', protect, async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Planning non trouvé'
      });
    }

    // Check permission
    if (req.user.role !== 'admin' && 
        schedule.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à supprimer ce planning'
      });
    }

    await schedule.deleteOne();

    await logAudit({
      user: req.user,
      action: 'delete',
      resource: 'schedule',
      resourceId: schedule._id,
      details: { title: schedule.title },
      req
    });

    res.json({
      success: true,
      message: 'Planning supprimé avec succès'
    });
  } catch (error) {
    console.error('❌ Error deleting schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du planning'
    });
  }
});

// @route   GET /api/schedules/my
// @desc    Get current user's schedules
// @access  Protected
router.get('/my', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {
      $or: [
        { createdBy: req.user._id },
        { assignedTo: req.user._id }
      ]
    };

    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate) };
      query.endDate = { $lte: new Date(endDate) };
    }

    const schedules = await Schedule.find(query)
      .populate('assignedTo', 'nom prenom email')
      .populate('beneficiary', 'nom prenom')
      .sort({ startDate: 1 });

    res.json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    console.error('❌ Error fetching user schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des plannings'
    });
  }
});

// @route   PATCH /api/schedules/:id/status
// @desc    Update schedule status
// @access  Protected
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Planning non trouvé'
      });
    }

    const previousStatus = schedule.status;
    schedule.status = status;
    await schedule.save();

    await logAudit({
      user: req.user,
      action: 'status_change',
      resource: 'schedule',
      resourceId: schedule._id,
      previousValues: { status: previousStatus },
      newValues: { status },
      req
    });

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('❌ Error updating schedule status:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut'
    });
  }
});

module.exports = router;
