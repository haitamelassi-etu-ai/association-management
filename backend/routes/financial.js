const express = require('express');
const router = express.Router();
const Financial = require('../models/Financial');
const { protect, authorize } = require('../middleware/auth');

// Get all transactions
router.get('/', protect, async (req, res) => {
  try {
    const { type, categorie, dateFrom, dateTo, search } = req.query;
    let query = {};

    if (type) query.type = type;
    if (categorie) query.categorie = categorie;
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
        { 'donateur.nom': { $regex: search, $options: 'i' } }
      ];
    }

    const transactions = await Financial.find(query)
      .populate('creePar', 'nom prenom')
      .populate('approuvePar', 'nom prenom')
      .sort({ date: -1 })
      .limit(500);

    res.json({ success: true, data: transactions, count: transactions.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get financial stats/summary
router.get('/stats', protect, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [monthlyStats, yearlyStats, categoryStats, recentTransactions] = await Promise.all([
      Financial.aggregate([
        { $match: { date: { $gte: startOfMonth } } },
        { $group: { _id: '$type', total: { $sum: '$montant' }, count: { $sum: 1 } } }
      ]),
      Financial.aggregate([
        { $match: { date: { $gte: startOfYear } } },
        { $group: { _id: '$type', total: { $sum: '$montant' }, count: { $sum: 1 } } }
      ]),
      Financial.aggregate([
        { $match: { date: { $gte: startOfYear } } },
        { $group: { _id: { type: '$type', categorie: '$categorie' }, total: { $sum: '$montant' } } },
        { $sort: { total: -1 } }
      ]),
      Financial.find().sort({ date: -1 }).limit(10).populate('creePar', 'nom prenom')
    ]);

    const monthRevenu = monthlyStats.find(s => s._id === 'revenu')?.total || 0;
    const monthDepense = monthlyStats.find(s => s._id === 'depense')?.total || 0;
    const yearRevenu = yearlyStats.find(s => s._id === 'revenu')?.total || 0;
    const yearDepense = yearlyStats.find(s => s._id === 'depense')?.total || 0;

    // Monthly trend (last 12 months)
    const monthlyTrend = await Financial.aggregate([
      { $match: { date: { $gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) } } },
      {
        $group: {
          _id: { month: { $month: '$date' }, year: { $year: '$date' }, type: '$type' },
          total: { $sum: '$montant' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        monthly: { revenu: monthRevenu, depense: monthDepense, solde: monthRevenu - monthDepense },
        yearly: { revenu: yearRevenu, depense: yearDepense, solde: yearRevenu - yearDepense },
        categories: categoryStats,
        monthlyTrend,
        recentTransactions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add a transaction
router.post('/', protect, async (req, res) => {
  try {
    const transaction = await Financial.create({
      ...req.body,
      creePar: req.user._id
    });
    const populated = await Financial.findById(transaction._id).populate('creePar', 'nom prenom');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update a transaction
router.put('/:id', protect, async (req, res) => {
  try {
    const transaction = await Financial.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('creePar', 'nom prenom');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction non trouvée' });
    }
    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Approve a transaction
router.put('/:id/approve', protect, authorize('admin', 'responsable'), async (req, res) => {
  try {
    const transaction = await Financial.findByIdAndUpdate(
      req.params.id,
      { approuve: true, approuvePar: req.user._id },
      { new: true }
    ).populate('creePar', 'nom prenom').populate('approuvePar', 'nom prenom');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction non trouvée' });
    }
    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete a transaction
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const transaction = await Financial.findByIdAndDelete(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction non trouvée' });
    }
    res.json({ success: true, message: 'Transaction supprimée' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
