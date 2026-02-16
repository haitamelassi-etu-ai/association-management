const express = require('express');
const router = express.Router();
const Volunteer = require('../models/Volunteer');
const { protect, authorize } = require('../middleware/auth');

// Get all volunteers
router.get('/', protect, async (req, res) => {
  try {
    const { status, search, competence } = req.query;
    let query = {};

    if (status) query.status = status;
    if (competence) query.competences = { $in: [competence] };
    if (search) {
      query.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { prenom: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const volunteers = await Volunteer.find(query)
      .populate('registeredBy', 'nom prenom')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: volunteers, count: volunteers.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get volunteer stats
router.get('/stats', protect, async (req, res) => {
  try {
    const [actifs, inactifs, enAttente, totalHeures] = await Promise.all([
      Volunteer.countDocuments({ status: 'actif' }),
      Volunteer.countDocuments({ status: 'inactif' }),
      Volunteer.countDocuments({ status: 'en_attente' }),
      Volunteer.aggregate([{ $group: { _id: null, total: { $sum: '$totalHeures' } } }])
    ]);

    res.json({
      success: true,
      data: {
        actifs,
        inactifs,
        enAttente,
        total: actifs + inactifs + enAttente,
        totalHeures: totalHeures[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add a volunteer
router.post('/', protect, async (req, res) => {
  try {
    const volunteer = await Volunteer.create({
      ...req.body,
      registeredBy: req.user._id
    });
    res.status(201).json({ success: true, data: volunteer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update a volunteer
router.put('/:id', protect, async (req, res) => {
  try {
    const volunteer = await Volunteer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Bénévole non trouvé' });
    }
    res.json({ success: true, data: volunteer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Add a task to a volunteer
router.post('/:id/tasks', protect, async (req, res) => {
  try {
    const volunteer = await Volunteer.findById(req.params.id);
    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Bénévole non trouvé' });
    }

    volunteer.taches.push(req.body);
    await volunteer.save();

    res.status(201).json({ success: true, data: volunteer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update task status & log hours
router.put('/:id/tasks/:taskId', protect, async (req, res) => {
  try {
    const volunteer = await Volunteer.findById(req.params.id);
    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Bénévole non trouvé' });
    }

    const task = volunteer.taches.id(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Tâche non trouvée' });
    }

    Object.assign(task, req.body);
    if (req.body.heures) {
      volunteer.totalHeures = volunteer.taches.reduce((sum, t) => sum + (t.heures || 0), 0);
    }
    await volunteer.save();

    res.json({ success: true, data: volunteer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete a volunteer
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const volunteer = await Volunteer.findByIdAndDelete(req.params.id);
    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Bénévole non trouvé' });
    }
    res.json({ success: true, message: 'Bénévole supprimé' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
