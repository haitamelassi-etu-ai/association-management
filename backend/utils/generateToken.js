const jwt = require('jsonwebtoken');

const getJwtSecret = () =>
  (process.env.JWT_SECRET || process.env.JWT_KEY || process.env.TOKEN_SECRET || '').trim();

const generateToken = (userId) => {
  const secret = getJwtSecret();
  if (!secret) {
    throw new Error('JWT secret is not set (expected one of: JWT_SECRET, JWT_KEY, TOKEN_SECRET)');
  }

  const rawExpiresIn = (process.env.JWT_EXPIRE || '').trim();
  const options = {};

  // If JWT_EXPIRE is missing/blank, default to 7 days.
  // (Avoid passing empty string, which crashes jsonwebtoken.)
  options.expiresIn = rawExpiresIn || '7d';

  return jwt.sign({ id: userId }, secret, options);
};

module.exports = generateToken;
