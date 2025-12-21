const express = require('express');
const router = express.Router();
const ExitLog = require('../models/ExitLog');
const Beneficiary = require('../models/Beneficiary');
const { protect, authorize } = require('../middleware/auth');
const { notifyAdmins, notificationTemplates } = require('../utils/notificationHelper');

// Get all exit logs with filters
router.get('/', protect, async (req, res) => {
  try {
    const { status, beneficiaryId, startDate, endDate, page = 1, limit = 50 } = req.query;

    let query = {};

    if (status) query.status = status;
    if (beneficiaryId) query.beneficiary = beneficiaryId;
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ExitLog.find(query)
        .populate('beneficiary', 'nom prenom cin photoUrl dateNaissance')
        .populate('authorizedBy', 'name email')
        .populate('returnRecordedBy', 'name email')
        .sort({ exitTime: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ExitLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: total
      }
    });
  } catch (error) {
    console.error('Error fetching exit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des sorties'
    });
  }
});

// Get currently out beneficiaries
router.get('/currently-out', protect, async (req, res) => {
  try {
    const logs = await ExitLog.getCurrentlyOut();

    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching currently out:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération'
    });
  }
});

// Get late returns
router.get('/late', protect, async (req, res) => {
  try {
    const logs = await ExitLog.getLateReturns();

    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching late returns:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération'
    });
  }
});

// Get statistics
router.get('/stats', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await ExitLog.getStatistics(start, end);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du calcul des statistiques'
    });
  }
});

// Get single exit log
router.get('/:id', protect, async (req, res) => {
  try {
    const log = await ExitLog.findById(req.params.id)
      .populate('beneficiary', 'nom prenom cin photoUrl dateNaissance')
      .populate('authorizedBy', 'name email')
      .populate('returnRecordedBy', 'name email');

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Enregistrement non trouvé'
      });
    }

    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Error fetching exit log:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération'
    });
  }
});

// Create new exit log
router.post('/', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const {
      beneficiaryId,
      exitTime,
      expectedReturnTime,
      destination,
      purpose,
      accompaniedBy,
      exitNotes,
      emergencyContact,
      medicalAlert,
      medicalAlertDetails
    } = req.body;

    console.log('📤 Creating exit log:', { beneficiaryId, exitTime, expectedReturnTime });

    // Check if beneficiary exists
    const beneficiary = await Beneficiary.findById(beneficiaryId);
    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'Bénéficiaire non trouvé'
      });
    }

    // Check if beneficiary already has an active exit
    const activeExit = await ExitLog.findOne({
      beneficiary: beneficiaryId,
      status: 'out'
    });

    if (activeExit) {
      return res.status(400).json({
        success: false,
        message: 'Ce bénéficiaire est déjà sorti'
      });
    }

    const exitLog = await ExitLog.create({
      beneficiary: beneficiaryId,
      exitTime: exitTime || new Date(),
      expectedReturnTime,
      destination,
      purpose,
      accompaniedBy,
      exitNotes,
      emergencyContact,
      medicalAlert,
      medicalAlertDetails,
      authorizedBy: req.user.id
    });

    await exitLog.populate('beneficiary', 'nom prenom cin photoUrl');
    await exitLog.populate('authorizedBy', 'name email');

    // Notify admins
    const beneficiaryName = `${beneficiary?.prenom || exitLog.beneficiary?.prenom || ''} ${beneficiary?.nom || exitLog.beneficiary?.nom || ''}`.trim();
    await notifyAdmins({
      ...notificationTemplates.beneficiaryExit(beneficiaryName),
      link: '/professional/exit-tracking',
      metadata: { exitLogId: exitLog._id, beneficiaryId },
      createdBy: req.user.id
    });

    console.log('✅ Exit log created:', exitLog._id);

    res.status(201).json({
      success: true,
      message: 'Sortie enregistrée avec succès',
      data: exitLog
    });
  } catch (error) {
    console.error('❌ Error creating exit log:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'enregistrement'
    });
  }
});

// Record return
router.patch('/:id/return', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { returnNotes } = req.body;

    console.log('📥 Recording return for:', req.params.id);

    const exitLog = await ExitLog.findById(req.params.id);

    if (!exitLog) {
      return res.status(404).json({
        success: false,
        message: 'Enregistrement non trouvé'
      });
    }

    if (exitLog.status !== 'out') {
      return res.status(400).json({
        success: false,
        message: 'Ce bénéficiaire n\'est pas sorti'
      });
    }

    await exitLog.recordReturn(returnNotes, req.user.id);
    await exitLog.populate('beneficiary', 'nom prenom cin photoUrl');
    await exitLog.populate('authorizedBy', 'name email');
    await exitLog.populate('returnRecordedBy', 'name email');

    // Notify admins
    const beneficiaryName = `${exitLog.beneficiary?.prenom || ''} ${exitLog.beneficiary?.nom || ''}`.trim();
    await notifyAdmins({
      type: 'success',
      title: 'Retour de Bénéficiaire',
      message: `${beneficiaryName} est revenu à la structure`,
      icon: '✅',
      link: '/professional/exit-tracking',
      metadata: { exitLogId: exitLog._id, beneficiaryId: exitLog.beneficiary?._id },
      createdBy: req.user.id
    });

    console.log('✅ Return recorded:', exitLog.status);

    res.json({
      success: true,
      message: 'Retour enregistré avec succès',
      data: exitLog
    });
  } catch (error) {
    console.error('❌ Error recording return:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement'
    });
  }
});

// Update exit log
router.put('/:id', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.beneficiary; // Can't change beneficiary
    delete updates.authorizedBy; // Can't change authorizer

    const exitLog = await ExitLog.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('beneficiary', 'nom prenom cin photoUrl')
      .populate('authorizedBy', 'name email')
      .populate('returnRecordedBy', 'name email');

    if (!exitLog) {
      return res.status(404).json({
        success: false,
        message: 'Enregistrement non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Enregistrement mis à jour',
      data: exitLog
    });
  } catch (error) {
    console.error('Error updating exit log:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour'
    });
  }
});

// Delete exit log
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const exitLog = await ExitLog.findByIdAndDelete(req.params.id);

    if (!exitLog) {
      return res.status(404).json({
        success: false,
        message: 'Enregistrement non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Enregistrement supprimé'
    });
  } catch (error) {
    console.error('Error deleting exit log:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression'
    });
  }
});

module.exports = router;
