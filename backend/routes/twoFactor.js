const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

// @route   POST /api/2fa/setup
// @desc    Setup 2FA for user
// @access  Protected
router.post('/setup', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA est déjà activé pour ce compte'
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Adel Elouerif (${user.email})`,
      issuer: 'Association Adel Elouerif'
    });

    // Store temp secret (not enabled yet)
    user.twoFactorTempSecret = secret.base32;
    await user.save();

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl
      }
    });
  } catch (error) {
    console.error('❌ Error setting up 2FA:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la configuration 2FA'
    });
  }
});

// @route   POST /api/2fa/verify
// @desc    Verify and enable 2FA
// @access  Protected
router.post('/verify', protect, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.twoFactorTempSecret) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez d\'abord configurer 2FA'
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorTempSecret,
      encoding: 'base32',
      token
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Code invalide. Réessayez.'
      });
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Enable 2FA
    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorEnabled = true;
    user.twoFactorBackupCodes = backupCodes.map(code => ({
      code,
      used: false
    }));
    user.twoFactorTempSecret = undefined;
    await user.save();

    await logAudit({
      user: req.user,
      action: 'password_change',
      resource: 'user',
      resourceId: user._id,
      details: { action: '2FA enabled' },
      req
    });

    res.json({
      success: true,
      message: '2FA activé avec succès',
      data: {
        backupCodes
      }
    });
  } catch (error) {
    console.error('❌ Error verifying 2FA:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification'
    });
  }
});

// @route   POST /api/2fa/disable
// @desc    Disable 2FA
// @access  Protected
router.post('/disable', protect, async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe incorrect'
      });
    }

    // Verify 2FA token
    if (user.twoFactorEnabled) {
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token
      });

      if (!verified) {
        return res.status(400).json({
          success: false,
          message: 'Code 2FA invalide'
        });
      }
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = undefined;
    await user.save();

    await logAudit({
      user: req.user,
      action: 'password_change',
      resource: 'user',
      resourceId: user._id,
      details: { action: '2FA disabled' },
      req
    });

    res.json({
      success: true,
      message: '2FA désactivé avec succès'
    });
  } catch (error) {
    console.error('❌ Error disabling 2FA:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la désactivation'
    });
  }
});

// @route   POST /api/2fa/validate
// @desc    Validate 2FA token during login
// @access  Public
router.post('/validate', async (req, res) => {
  try {
    const { userId, token } = req.body;
    const user = await User.findById(userId);

    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Configuration 2FA invalide'
      });
    }

    // Try TOTP first
    let verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1
    });

    // If TOTP fails, try backup codes
    if (!verified && user.twoFactorBackupCodes) {
      const backupCode = user.twoFactorBackupCodes.find(
        bc => bc.code === token.toUpperCase() && !bc.used
      );

      if (backupCode) {
        backupCode.used = true;
        await user.save();
        verified = true;
      }
    }

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: 'Code invalide'
      });
    }

    res.json({
      success: true,
      message: 'Vérification réussie'
    });
  } catch (error) {
    console.error('❌ Error validating 2FA:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la validation'
    });
  }
});

// @route   GET /api/2fa/backup-codes
// @desc    Get new backup codes
// @access  Protected
router.get('/backup-codes', protect, async (req, res) => {
  try {
    const { token } = req.query;
    const user = await User.findById(req.user._id);

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA n\'est pas activé'
      });
    }

    // Verify current token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token
    });

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: 'Code invalide'
      });
    }

    // Generate new backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    user.twoFactorBackupCodes = backupCodes.map(code => ({
      code,
      used: false
    }));
    await user.save();

    res.json({
      success: true,
      data: {
        backupCodes
      }
    });
  } catch (error) {
    console.error('❌ Error generating backup codes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération des codes'
    });
  }
});

module.exports = router;
