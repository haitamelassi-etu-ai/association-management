const express = require('express');
const router = express.Router();
const {
  getBeneficiaries,
  getBeneficiary,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  addSuiviSocial,
  getStats
} = require('../controllers/beneficiaryController');
const { protect, authorize } = require('../middleware/auth');

router.get('/stats/dashboard', protect, getStats);
router.get('/', protect, getBeneficiaries);
router.get('/:id', protect, getBeneficiary);
router.post('/', protect, createBeneficiary);
router.put('/:id', protect, updateBeneficiary);
router.delete('/:id', protect, authorize('admin'), deleteBeneficiary);
router.post('/:id/suivi', protect, addSuiviSocial);

module.exports = router;
