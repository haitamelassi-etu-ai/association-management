const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }

  const rawExpiresIn = (process.env.JWT_EXPIRE || '').trim();
  const options = {};

  // If JWT_EXPIRE is missing/blank, default to 7 days.
  // (Avoid passing empty string, which crashes jsonwebtoken.)
  options.expiresIn = rawExpiresIn || '7d';

  return jwt.sign({ id: userId }, secret, options);
};

module.exports = generateToken;
