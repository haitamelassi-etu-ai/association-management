const News = require('../models/News');

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

// @desc    Get active news (public)
// @route   GET /api/news
// @access  Public
exports.getPublicNews = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '6', 10) || 6, 50);

    const items = await News.find({ isActive: true })
      .sort({ date: -1, createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all news (admin)
// @route   GET /api/news/all
// @access  Private/Admin
exports.getAllNews = async (req, res) => {
  try {
    const items = await News.find({})
      .populate('createdBy', 'nom prenom role')
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create news
// @route   POST /api/news
// @access  Private/Admin
exports.createNews = async (req, res) => {
  try {
    const { title, description, date, image, isActive } = req.body;

    const parsedDate = parseDate(date);
    if (!parsedDate) {
      return res.status(400).json({ success: false, message: 'Date invalide' });
    }

    const item = await News.create({
      title,
      description,
      date: parsedDate,
      image: typeof image === 'string' ? image : '',
      isActive: typeof isActive === 'boolean' ? isActive : true,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update news
// @route   PUT /api/news/:id
// @access  Private/Admin
exports.updateNews = async (req, res) => {
  try {
    const { title, description, date, image, isActive } = req.body;

    const update = {};
    if (typeof title === 'string') update.title = title;
    if (typeof description === 'string') update.description = description;
    if (typeof image === 'string') update.image = image;
    if (typeof isActive === 'boolean') update.isActive = isActive;

    if (date !== undefined) {
      const parsedDate = parseDate(date);
      if (!parsedDate) {
        return res.status(400).json({ success: false, message: 'Date invalide' });
      }
      update.date = parsedDate;
    }

    const item = await News.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Actualité non trouvée' });
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete news
// @route   DELETE /api/news/:id
// @access  Private/Admin
exports.deleteNews = async (req, res) => {
  try {
    const item = await News.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Actualité non trouvée' });
    }

    res.status(200).json({ success: true, message: 'Actualité supprimée' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
