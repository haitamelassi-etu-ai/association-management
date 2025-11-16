const Announcement = require('../models/Announcement');

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Private
exports.getAnnouncements = async (req, res) => {
  try {
    const { type, priorite } = req.query;
    
    let query = { isActive: true };
    
    // Filter by user role
    query.$or = [
      { destinataires: 'all' },
      { destinataires: req.user.role }
    ];
    
    if (type) query.type = type;
    if (priorite) query.priorite = priorite;
    
    const announcements = await Announcement.find(query)
      .populate('createdBy', 'nom prenom')
      .sort({ priorite: -1, createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create announcement
// @route   POST /api/announcements
// @access  Private/Admin/Staff
exports.createAnnouncement = async (req, res) => {
  try {
    req.body.createdBy = req.user._id;
    
    const announcement = await Announcement.create(req.body);
    
    res.status(201).json({
      success: true,
      data: announcement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private/Admin
exports.deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Annonce non trouvée'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Annonce supprimée avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
