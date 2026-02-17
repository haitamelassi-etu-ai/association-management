const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Private/Admin
exports.register = async (req, res) => {
  try {
    const { nom, prenom, email, password, role, telephone, poste } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }

    // Create user
    const user = await User.create({
      nom,
      prenom,
      email,
      password,
      role: role || 'staff',
      telephone,
      poste
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    const { password } = req.body;
    console.log('🔐 Login attempt:', { email, passwordProvided: !!password });

    // Validate input
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir email et mot de passe'
      });
    }

    // Check user
    const user = await User.findOne({ email }).select('+password');
    console.log('👤 User found:', !!user);
    if (!user) {
      console.log('❌ User not found for email:', email);
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ User is not active:', email);
      return res.status(401).json({
        success: false,
        message: 'Compte désactivé. Contactez l\'administrateur'
      });
    }

    // Check password
    const passwordHashRegex = /^\$2[aby]\$\d{2}\$/;
    const storedPassword = user.password || '';
    const isStoredPasswordHashed = passwordHashRegex.test(storedPassword);

    let isMatch = false;

    if (isStoredPasswordHashed) {
      isMatch = await user.comparePassword(password);
    } else {
      isMatch = storedPassword === password;

      if (isMatch) {
        user.password = password;
        await user.save();
      }
    }

    console.log('🔑 Password match:', isMatch);
    if (!isMatch) {
      console.log('❌ Invalid password for user:', email);
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    console.log('✅ Login successful for:', email);
    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    console.error('💥 Login error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
