const express = require('express');
const router = express.Router();

const {
  getPublicNews,
  getAllNews,
  createNews,
  updateNews,
  deleteNews,
} = require('../controllers/newsController');

const { protect, authorize } = require('../middleware/auth');

// Public homepage feed
router.get('/', getPublicNews);

// Admin feed
router.get('/all', protect, authorize('admin'), getAllNews);

router.post('/', protect, authorize('admin'), createNews);
router.put('/:id', protect, authorize('admin'), updateNews);
router.delete('/:id', protect, authorize('admin'), deleteNews);

module.exports = router;
