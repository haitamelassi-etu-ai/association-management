const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

router.use(protect);

// Get integrations settings
router.get('/integrations', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('integrations');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: user.integrations || {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update integrations settings
router.patch('/integrations', async (req, res) => {
  try {
    const updates = req.body || {};

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const current = user.integrations || {};
    user.integrations = {
      ...current,
      googleCalendar: { ...current.googleCalendar, ...(updates.googleCalendar || {}) },
      whatsapp: { ...current.whatsapp, ...(updates.whatsapp || {}) },
      emailjs: { ...current.emailjs, ...(updates.emailjs || {}) }
    };

    await user.save();

    res.json({
      success: true,
      data: user.integrations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
