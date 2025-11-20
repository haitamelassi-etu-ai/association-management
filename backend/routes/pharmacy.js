const express = require('express');
const router = express.Router();
const PharmacyStock = require('../models/PharmacyStock');
const { protect, authorize } = require('../middleware/auth');

// Get all pharmacy medications
router.get('/', protect, async (req, res) => {
  try {
    const { category, search, active } = req.query;
    
    let query = {};
    
    if (category) query.category = category;
    if (active !== undefined) query.active = active === 'true';
    if (search) {
      query.$text = { $search: search };
    }

    const medications = await PharmacyStock.find(query)
      .populate('createdBy', 'name email')
      .sort({ medicationName: 1 });

    res.json({
      success: true,
      count: medications.length,
      data: medications
    });
  } catch (error) {
    console.error('Error fetching pharmacy stock:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du stock'
    });
  }
});

// Get low stock medications
router.get('/alerts/low-stock', protect, async (req, res) => {
  try {
    const medications = await PharmacyStock.getLowStock();

    res.json({
      success: true,
      count: medications.length,
      data: medications
    });
  } catch (error) {
    console.error('Error fetching low stock:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération'
    });
  }
});

// Get expired medications
router.get('/alerts/expired', protect, async (req, res) => {
  try {
    const medications = await PharmacyStock.getExpired();

    res.json({
      success: true,
      count: medications.length,
      data: medications
    });
  } catch (error) {
    console.error('Error fetching expired medications:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération'
    });
  }
});

// Get expiring soon medications
router.get('/alerts/expiring-soon', protect, async (req, res) => {
  try {
    const medications = await PharmacyStock.getExpiringSoon();

    res.json({
      success: true,
      count: medications.length,
      data: medications
    });
  } catch (error) {
    console.error('Error fetching expiring medications:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération'
    });
  }
});

// Get single medication
router.get('/:id', protect, async (req, res) => {
  try {
    const medication = await PharmacyStock.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Médicament non trouvé'
      });
    }

    res.json({
      success: true,
      data: medication
    });
  } catch (error) {
    console.error('Error fetching medication:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération'
    });
  }
});

// Add new medication to pharmacy stock
router.post('/', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    console.log('📥 POST /api/pharmacy - Body:', req.body);
    console.log('👤 User:', req.user?.id);
    
    const {
      medicationName,
      genericName,
      category,
      dosageForm,
      strength,
      stock,
      minStockLevel,
      expiryDate,
      batchNumber,
      supplier,
      costPerUnit,
      storageInstructions
    } = req.body;

    const medication = await PharmacyStock.create({
      medicationName,
      genericName,
      category,
      dosageForm,
      strength,
      stock,
      minStockLevel: minStockLevel || 20,
      expiryDate,
      batchNumber,
      supplier,
      costPerUnit,
      storageInstructions,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Médicament ajouté au stock',
      data: medication
    });
  } catch (error) {
    console.error('❌ Error adding medication:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'هذا الدواء بنفس التركيز والشكل موجود مسبقاً'
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'ajout'
    });
  }
});

// Update medication stock
router.patch('/:id/stock', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { stock, operation } = req.body; // operation: 'set', 'add', 'subtract'

    const medication = await PharmacyStock.findById(req.params.id);

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Médicament non trouvé'
      });
    }

    if (operation === 'add') {
      medication.stock += stock;
    } else if (operation === 'subtract') {
      medication.stock = Math.max(0, medication.stock - stock);
    } else {
      medication.stock = stock;
    }

    await medication.save();

    res.json({
      success: true,
      message: 'Stock mis à jour',
      data: medication
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour'
    });
  }
});

// Update medication details
router.put('/:id', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const allowedUpdates = [
      'medicationName', 'genericName', 'category', 'dosageForm', 'strength',
      'minStockLevel', 'expiryDate', 'batchNumber', 'supplier', 
      'costPerUnit', 'storageInstructions', 'active'
    ];

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const medication = await PharmacyStock.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Médicament non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Médicament mis à jour',
      data: medication
    });
  } catch (error) {
    console.error('Error updating medication:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour'
    });
  }
});

// Delete medication
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const medication = await PharmacyStock.findById(req.params.id);
    
    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Médicament non trouvé'
      });
    }

    await medication.deleteOne();

    res.json({
      success: true,
      message: 'Médicament supprimé'
    });
  } catch (error) {
    console.error('Error deleting medication:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression'
    });
  }
});

module.exports = router;
