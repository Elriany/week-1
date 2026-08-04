const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Generates a signed JWT token containing user info.
 * @param {Object} payload - User identification and role data
 * @returns {string} Signed JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

/**
 * Verifies a JWT token.
 * @param {string} token - Bearer JWT token string
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, config.jwtSecret);
};

module.exports = {
  generateToken,
  verifyToken,
};
