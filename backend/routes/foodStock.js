const express = require('express');
const router = express.Router();
const foodStockController = require('../controllers/foodStockController');
const { protect } = require('../middleware/auth');

// Routes principales
router.get('/', protect, foodStockController.getAllStock);
router.post('/', protect, foodStockController.createStockItem);

// Routes des alertes et statistiques
router.get('/alerts/all', protect, foodStockController.getAlerts);
router.get('/stats/overview', protect, foodStockController.getStatistics);

// Routes pour un article spécifique
router.get('/:id', protect, foodStockController.getStockItem);
router.put('/:id', protect, foodStockController.updateStockItem);
router.delete('/:id', protect, foodStockController.deleteStockItem);
router.post('/:id/consommer', protect, foodStockController.consommerStock);
router.post('/:id/adjust', protect, foodStockController.adjustStock);
router.get('/:id/plan', protect, foodStockController.getPlanConsommation);

module.exports = router;
