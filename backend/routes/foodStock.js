const express = require('express');
const router = express.Router();
const foodStockController = require('../controllers/foodStockController');
const { protect, authorize } = require('../middleware/auth');

// Routes principales
router.get('/', protect, foodStockController.getAllStock);
router.post('/', protect, foodStockController.createStockItem);

// Barcode lookup
router.get('/by-barcode/:barcode', protect, authorize('admin', 'responsable'), foodStockController.getByBarcode);

// Routes des alertes et statistiques
router.get('/alerts/all', protect, foodStockController.getAlerts);
router.get('/stats/overview', protect, foodStockController.getStatistics);
router.get('/stats/charts', protect, foodStockController.getChartData);
router.get('/stats/expiration-calendar', protect, foodStockController.getExpirationCalendar);

// Routes pour un article spécifique
router.get('/:id', protect, foodStockController.getStockItem);
router.put('/:id', protect, foodStockController.updateStockItem);
router.delete('/:id', protect, foodStockController.deleteStockItem);
router.post('/:id/consommer', protect, foodStockController.consommerStock);
router.post('/:id/adjust', protect, foodStockController.adjustStock);
router.get('/:id/plan', protect, foodStockController.getPlanConsommation);
router.get('/:id/history', protect, foodStockController.getItemHistory);

module.exports = router;
