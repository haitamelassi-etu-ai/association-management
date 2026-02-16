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

module.exports = router;
