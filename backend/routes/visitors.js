const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor');
const { protect, authorize } = require('../middleware/auth');

// Get all visitors (with filters)
router.get('/', protect, async (req, res) => {
  try {
    const { status, date, beneficiaire, search } = req.query;
    let query = {};

    if (status) query.status = status;
    if (beneficiaire) query.beneficiaire = beneficiaire;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.signIn = { $gte: start, $lte: end };
    }
    if (search) {
      query.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { prenom: { $regex: search, $options: 'i' } },
        { cin: { $regex: search, $options: 'i' } }
      ];
    }

    const visitors = await Visitor.find(query)
      .populate('beneficiaire', 'nom prenom')
      .populate('registeredBy', 'nom prenom')
      .sort({ signIn: -1 })
      .limit(200);

    res.json({ success: true, data: visitors, count: visitors.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get visitor stats
router.get('/stats', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);

    const [totalToday, currentlyPresent, totalMonth, totalAll] = await Promise.all([
      Visitor.countDocuments({ signIn: { $gte: today, $lte: endToday } }),
      Visitor.countDocuments({ status: 'present' }),
      Visitor.countDocuments({
        signIn: { $gte: new Date(today.getFullYear(), today.getMonth(), 1) }
      }),
      Visitor.countDocuments()
    ]);

    res.json({
      success: true,
      data: { totalToday, currentlyPresent, totalMonth, totalAll }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Sign in a visitor
router.post('/', protect, async (req, res) => {
  try {
    const visitor = await Visitor.create({
      ...req.body,
      registeredBy: req.user._id,
      signIn: new Date(),
      status: 'present'
    });

    const populated = await Visitor.findById(visitor._id)
      .populate('beneficiaire', 'nom prenom')
      .populate('registeredBy', 'nom prenom');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Sign out a visitor
router.put('/:id/signout', protect, async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(
      req.params.id,
      { signOut: new Date(), status: 'sorti' },
      { new: true }
    ).populate('beneficiaire', 'nom prenom');

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visiteur non trouvé' });
    }

    res.json({ success: true, data: visitor });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update a visitor
router.put('/:id', protect, async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('beneficiaire', 'nom prenom');

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visiteur non trouvé' });
    }

    res.json({ success: true, data: visitor });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete a visitor record
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndDelete(req.params.id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visiteur non trouvé' });
    }
    res.json({ success: true, message: 'Enregistrement supprimé' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
