const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getBeneficiaries,
  getBeneficiary,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  addSuiviSocial,
  getStats,
  importFromExcel,
  addDistribution,
  getDistributions,
  getAllDistributions,
  getImportTemplate
} = require('../controllers/beneficiaryController');
const { protect, authorize } = require('../middleware/auth');

// Multer config for Excel import (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Format non supporté. Utilisez un fichier Excel (.xlsx ou .xls)'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// Multer config for photo upload (memory storage -> base64)
const photoUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image sont autorisés (JPG, PNG, GIF)'), false);
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB max
});

// Stats & distributions (before :id routes)
router.get('/stats/dashboard', protect, getStats);
router.get('/distributions/all', protect, getAllDistributions);
router.get('/export/template', protect, getImportTemplate);

// Import
router.post('/import', protect, upload.single('file'), importFromExcel);

// CRUD
router.get('/', protect, getBeneficiaries);
router.get('/:id', protect, getBeneficiary);
router.post('/', protect, createBeneficiary);
router.put('/:id', protect, updateBeneficiary);
router.delete('/:id', protect, authorize('admin'), deleteBeneficiary);

// Suivi social
router.post('/:id/suivi', protect, addSuiviSocial);

// Distributions per beneficiary
router.get('/:id/distributions', protect, getDistributions);
router.post('/:id/distributions', protect, addDistribution);

// Photo upload (base64 stored in MongoDB)
router.put('/:id/photo', protect, photoUpload.single('photo'), async (req, res) => {
  try {
    const Beneficiary = require('../models/Beneficiary');
    const beneficiary = await Beneficiary.findById(req.params.id);
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Bénéficiaire non trouvé' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier envoyé' });
    }
    // Convert to base64 data URL
    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
    beneficiary.photo = dataUrl;
    await beneficiary.save();
    res.json({ success: true, data: { photo: dataUrl } });
  } catch (error) {
    console.error('Erreur upload photo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete photo
router.delete('/:id/photo', protect, async (req, res) => {
  try {
    const Beneficiary = require('../models/Beneficiary');
    const beneficiary = await Beneficiary.findById(req.params.id);
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Bénéficiaire non trouvé' });
    }
    beneficiary.photo = null;
    await beneficiary.save();
    res.json({ success: true, message: 'Photo supprimée' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
