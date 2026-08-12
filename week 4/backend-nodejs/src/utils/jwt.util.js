const jwt = require('jsonwebtoken');
const env = require('../config/environment');

/**
 * Generate a signed JWT with the given payload.
 */
const generateToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
};

/**
 * Verify and decode a JWT.
 */
const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
