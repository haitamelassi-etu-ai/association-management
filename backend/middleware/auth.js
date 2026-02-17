const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getJwtSecret = () =>
  (process.env.JWT_SECRET || process.env.JWT_KEY || process.env.TOKEN_SECRET || '').trim();

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Non autorisé - Token manquant' 
    });
  }

  try {
    const secret = getJwtSecret();
    if (!secret) {
      return res.status(500).json({
        success: false,
        message: 'Configuration JWT manquante'
      });
    }

    const decoded = jwt.verify(token, secret);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user || !req.user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Utilisateur non trouvé ou inactif' 
      });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Non autorisé - Token invalide' 
    });
  }
};

// Authorize roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} n'est pas autorisé à accéder à cette route`
      });
    }
    next();
  };
};
