const express = require('express');
const router = express.Router();
const Communication = require('../models/Communication');
const { protect, authorize } = require('../middleware/auth');

// Get all communications
router.get('/', protect, async (req, res) => {
  try {
    const { type, status, priorite, search } = req.query;
    let query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (priorite) query.priorite = priorite;
    if (search) {
      query.$or = [
        { sujet: { $regex: search, $options: 'i' } },
        { contenu: { $regex: search, $options: 'i' } }
      ];
    }

    const communications = await Communication.find(query)
      .populate('creePar', 'nom prenom')
      .populate('reponses.auteur', 'nom prenom')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, data: communications, count: communications.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get communication stats
router.get('/stats', protect, async (req, res) => {
  try {
    const [total, brouillons, envoyes, planifies, byType, byPriorite] = await Promise.all([
      Communication.countDocuments(),
      Communication.countDocuments({ status: 'brouillon' }),
      Communication.countDocuments({ status: 'envoye' }),
      Communication.countDocuments({ status: 'planifie' }),
      Communication.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Communication.aggregate([{ $group: { _id: '$priorite', count: { $sum: 1 } } }])
    ]);

    res.json({
      success: true,
      data: { total, brouillons, envoyes, planifies, byType, byPriorite }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get a single communication
router.get('/:id', protect, async (req, res) => {
  try {
    const comm = await Communication.findById(req.params.id)
      .populate('creePar', 'nom prenom')
      .populate('reponses.auteur', 'nom prenom')
      .populate('lu.user', 'nom prenom');

    if (!comm) {
      return res.status(404).json({ success: false, message: 'Communication non trouvée' });
    }

    // Mark as read
    const alreadyRead = comm.lu.some(l => l.user._id.toString() === req.user._id.toString());
    if (!alreadyRead) {
      comm.lu.push({ user: req.user._id });
      await comm.save();
    }

    res.json({ success: true, data: comm });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create a communication
router.post('/', protect, async (req, res) => {
  try {
    const comm = await Communication.create({
      ...req.body,
      creePar: req.user._id
    });

    const populated = await Communication.findById(comm._id).populate('creePar', 'nom prenom');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update a communication
router.put('/:id', protect, async (req, res) => {
  try {
    const comm = await Communication.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('creePar', 'nom prenom');

    if (!comm) {
      return res.status(404).json({ success: false, message: 'Communication non trouvée' });
    }
    res.json({ success: true, data: comm });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Send a communication (change status to 'envoye')
router.post('/:id/send', protect, async (req, res) => {
  try {
    const comm = await Communication.findByIdAndUpdate(
      req.params.id,
      { status: 'envoye', dateEnvoi: new Date() },
      { new: true }
    ).populate('creePar', 'nom prenom');

    if (!comm) {
      return res.status(404).json({ success: false, message: 'Communication non trouvée' });
    }
    res.json({ success: true, data: comm });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Reply to a communication
router.post('/:id/reply', protect, async (req, res) => {
  try {
    const comm = await Communication.findById(req.params.id);
    if (!comm) {
      return res.status(404).json({ success: false, message: 'Communication non trouvée' });
    }

    comm.reponses.push({
      auteur: req.user._id,
      contenu: req.body.contenu
    });
    await comm.save();

    const populated = await Communication.findById(comm._id)
      .populate('creePar', 'nom prenom')
      .populate('reponses.auteur', 'nom prenom');

    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete a communication
router.delete('/:id', protect, authorize('admin', 'responsable'), async (req, res) => {
  try {
    const comm = await Communication.findByIdAndDelete(req.params.id);
    if (!comm) {
      return res.status(404).json({ success: false, message: 'Communication non trouvée' });
    }
    res.json({ success: true, message: 'Communication supprimée' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
