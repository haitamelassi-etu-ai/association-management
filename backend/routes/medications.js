const express = require('express');
const router = express.Router();
const Medication = require('../models/Medication');
const Beneficiary = require('../models/Beneficiary');
const PharmacyStock = require('../models/PharmacyStock');
const { protect, authorize } = require('../middleware/auth');

// Get all medications with filters
router.get('/', protect, async (req, res) => {
  try {
    const { beneficiaryId, active, chronicTreatment } = req.query;
    
    let query = {};
    
    if (beneficiaryId) query.beneficiary = beneficiaryId;
    if (active !== undefined) query.active = active === 'true';
    if (chronicTreatment !== undefined) query.chronicTreatment = chronicTreatment === 'true';

    const medications = await Medication.find(query)
      .populate('beneficiary', 'nom prenom cin photoUrl')
      .populate('pharmacyMedication')
      .populate('createdBy', 'name email')
      .populate('administrationLog.administeredBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: medications.length,
      data: medications
    });
  } catch (error) {
    console.error('Error fetching medications:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des médicaments'
    });
  }
});

// Get today's medication schedule for a beneficiary
router.get('/schedule/today/:beneficiaryId', protect, async (req, res) => {
  try {
    const schedule = await Medication.getTodaySchedule(req.params.beneficiaryId);

    res.json({
      success: true,
      count: schedule.length,
      data: schedule
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du planning'
    });
  }
});

// Get medications needing refill
router.get('/refill/needed', protect, async (req, res) => {
  try {
    const medications = await Medication.getNeedingRefill();

    res.json({
      success: true,
      count: medications.length,
      data: medications
    });
  } catch (error) {
    console.error('Error fetching refill list:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la liste de réapprovisionnement'
    });
  }
});

// Get medication statistics
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await Medication.getStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
});

// Get single medication
router.get('/:id', protect, async (req, res) => {
  try {
    const medication = await Medication.findById(req.params.id)
      .populate('beneficiary', 'nom prenom cin photoUrl')
      .populate('pharmacyMedication')
      .populate('createdBy', 'name email')
      .populate('administrationLog.administeredBy', 'name');

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
      message: 'Erreur lors de la récupération du médicament'
    });
  }
});

// Create new medication prescription
router.post('/', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const {
      beneficiaryId,
      pharmacyMedicationId,
      dosage,
      frequency,
      times,
      withFood,
      startDate,
      endDate,
      prescribedBy,
      instructions,
      sideEffects,
      chronicTreatment
    } = req.body;

    // Check if beneficiary exists
    const beneficiary = await Beneficiary.findById(beneficiaryId);
    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'Bénéficiaire non trouvé'
      });
    }

    // Check if pharmacy medication exists
    const pharmacyMed = await PharmacyStock.findById(pharmacyMedicationId);
    if (!pharmacyMed) {
      return res.status(404).json({
        success: false,
        message: 'Médicament non trouvé dans le stock'
      });
    }

    const medication = await Medication.create({
      beneficiary: beneficiaryId,
      pharmacyMedication: pharmacyMedicationId,
      dosage,
      frequency,
      times,
      withFood,
      startDate: startDate || new Date(),
      endDate,
      prescribedBy,
      instructions,
      sideEffects,
      chronicTreatment,
      createdBy: req.user.id
    });

    await medication.populate('beneficiary', 'nom prenom cin');
    await medication.populate('pharmacyMedication');
    await medication.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Médicament ajouté avec succès',
      data: medication
    });
  } catch (error) {
    console.error('Error creating medication:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout du médicament'
    });
  }
});

// Log medication administration
router.post('/:id/administer', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { time, administered = true, notes = '', quantityGiven = 1 } = req.body;

    console.log('📋 Administration request:', { 
      medicationId: req.params.id, 
      time, 
      administered, 
      quantityGiven 
    });

    const medication = await Medication.findById(req.params.id)
      .populate('pharmacyMedication');
    
    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Médicament non trouvé'
      });
    }

    console.log('💊 Before administration - Pharmacy stock:', 
      medication.pharmacyMedication?.stock || 'N/A'
    );

    await medication.logAdministration(time, req.user.id, administered, notes, quantityGiven);
    
    // Reload to get updated pharmacy stock
    await medication.populate('beneficiary', 'nom prenom');
    await medication.populate('pharmacyMedication');
    await medication.populate('administrationLog.administeredBy', 'name');

    console.log('✅ After administration - Pharmacy stock:', 
      medication.pharmacyMedication?.stock || 'N/A'
    );

    res.json({
      success: true,
      message: administered ? `تم تسجيل تناول الدواء (${quantityGiven} وحدة)` : 'تم تسجيل عدم تناول الدواء',
      data: medication,
      stockUpdated: administered,
      remainingStock: medication.pharmacyMedication?.stock
    });
  } catch (error) {
    console.error('❌ Error logging administration:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement'
    });
  }
});

// Update medication stock
router.patch('/:id/stock', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { stock } = req.body;

    const medication = await Medication.findByIdAndUpdate(
      req.params.id,
      { stock },
      { new: true, runValidators: true }
    ).populate('beneficiary', 'nom prenom');

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Médicament non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Stock mis à jour',
      data: medication
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du stock'
    });
  }
});

// Update medication
router.put('/:id', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const allowedUpdates = [
      'medicationName', 'dosage', 'frequency', 'times', 'withFood',
      'endDate', 'prescribedBy', 'instructions', 'sideEffects',
      'active', 'chronicTreatment', 'stock', 'refillReminder'
    ];

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const medication = await Medication.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('beneficiary', 'nom prenom');

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Médicament non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Médicament mis à jour avec succès',
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
    const medication = await Medication.findById(req.params.id);
    
    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Médicament non trouvé'
      });
    }

    await medication.deleteOne();

    res.json({
      success: true,
      message: 'Médicament supprimé avec succès'
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
