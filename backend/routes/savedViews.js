const express = require('express');
const router = express.Router();
const SavedView = require('../models/SavedView');
const { protect } = require('../middleware/auth');

// @route   GET /api/saved-views
// @desc    Get user's saved views
// @access  Protected
router.get('/', protect, async (req, res) => {
  try {
    const { resource } = req.query;

    const query = {
      $or: [
        { user: req.user._id },
        { isShared: true }
      ]
    };

    if (resource) query.resource = resource;

    const views = await SavedView.find(query)
      .populate('user', 'nom prenom')
      .sort({ isDefault: -1, name: 1 });

    res.json({
      success: true,
      data: views
    });
  } catch (error) {
    console.error('❌ Error fetching saved views:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des vues'
    });
  }
});

// @route   POST /api/saved-views
// @desc    Create a saved view
// @access  Protected
router.post('/', protect, async (req, res) => {
  try {
    const viewData = {
      ...req.body,
      user: req.user._id
    };

    // If setting as default, unset other defaults for this resource
    if (viewData.isDefault) {
      await SavedView.updateMany(
        { user: req.user._id, resource: viewData.resource },
        { isDefault: false }
      );
    }

    const view = await SavedView.create(viewData);

    res.status(201).json({
      success: true,
      data: view
    });
  } catch (error) {
    console.error('❌ Error creating saved view:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la vue'
    });
  }
});

// @route   PUT /api/saved-views/:id
// @desc    Update a saved view
// @access  Protected
router.put('/:id', protect, async (req, res) => {
  try {
    const view = await SavedView.findById(req.params.id);

    if (!view) {
      return res.status(404).json({
        success: false,
        message: 'Vue non trouvée'
      });
    }

    if (view.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à modifier cette vue'
      });
    }

    // If setting as default, unset other defaults
    if (req.body.isDefault) {
      await SavedView.updateMany(
        { user: req.user._id, resource: view.resource, _id: { $ne: view._id } },
        { isDefault: false }
      );
    }

    const updatedView = await SavedView.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({
      success: true,
      data: updatedView
    });
  } catch (error) {
    console.error('❌ Error updating saved view:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la vue'
    });
  }
});

// @route   DELETE /api/saved-views/:id
// @desc    Delete a saved view
// @access  Protected
router.delete('/:id', protect, async (req, res) => {
  try {
    const view = await SavedView.findById(req.params.id);

    if (!view) {
      return res.status(404).json({
        success: false,
        message: 'Vue non trouvée'
      });
    }

    if (view.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à supprimer cette vue'
      });
    }

    await view.deleteOne();

    res.json({
      success: true,
      message: 'Vue supprimée avec succès'
    });
  } catch (error) {
    console.error('❌ Error deleting saved view:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la vue'
    });
  }
});

module.exports = router;
