const express = require('express');
const router = express.Router();
const HealthRecord = require('../models/HealthRecord');
const { protect, authorize } = require('../middleware/auth');

// Get all health records
router.get('/', protect, async (req, res) => {
  try {
    const { beneficiaire, type, dateFrom, dateTo, urgence, search } = req.query;
    let query = {};

    if (beneficiaire) query.beneficiaire = beneficiaire;
    if (type) query.type = type;
    if (urgence === 'true') query.urgence = true;
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }
    if (search) {
      query.$or = [
        { diagnostic: { $regex: search, $options: 'i' } },
        { medecin: { $regex: search, $options: 'i' } },
        { traitement: { $regex: search, $options: 'i' } }
      ];
    }

    const records = await HealthRecord.find(query)
      .populate('beneficiaire', 'nom prenom dateNaissance')
      .populate('creePar', 'nom prenom')
      .sort({ date: -1 })
      .limit(200);

    res.json({ success: true, data: records, count: records.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get health stats
router.get('/stats', protect, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalRecords, monthlyRecords, upcomingRdv, typeStats, urgentCount] = await Promise.all([
      HealthRecord.countDocuments(),
      HealthRecord.countDocuments({ date: { $gte: startOfMonth } }),
      HealthRecord.find({ prochainRdv: { $gte: now } })
        .populate('beneficiaire', 'nom prenom')
        .sort({ prochainRdv: 1 })
        .limit(10),
      HealthRecord.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      HealthRecord.countDocuments({ urgence: true, date: { $gte: startOfMonth } })
    ]);

    res.json({
      success: true,
      data: {
        totalRecords,
        monthlyRecords,
        upcomingRdv,
        typeStats,
        urgentCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get records for a specific beneficiary
router.get('/beneficiary/:id', protect, async (req, res) => {
  try {
    const records = await HealthRecord.find({ beneficiaire: req.params.id })
      .populate('creePar', 'nom prenom')
      .sort({ date: -1 });

    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add a health record
router.post('/', protect, async (req, res) => {
  try {
    const record = await HealthRecord.create({
      ...req.body,
      creePar: req.user._id
    });

    const populated = await HealthRecord.findById(record._id)
      .populate('beneficiaire', 'nom prenom')
      .populate('creePar', 'nom prenom');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update a health record
router.put('/:id', protect, async (req, res) => {
  try {
    const record = await HealthRecord.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('beneficiaire', 'nom prenom').populate('creePar', 'nom prenom');

    if (!record) {
      return res.status(404).json({ success: false, message: 'Dossier non trouvé' });
    }
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete a health record
router.delete('/:id', protect, authorize('admin', 'responsable'), async (req, res) => {
  try {
    const record = await HealthRecord.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Dossier non trouvé' });
    }
    res.json({ success: true, message: 'Dossier supprimé' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
