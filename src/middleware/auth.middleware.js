const { verifyToken } = require('../utils/jwt.util');
const { sendError } = require('../utils/response.util');
const HTTP_STATUS = require('../constants/httpStatus');
const MESSAGES = require('../constants/messages');

/**
 * Authentication Middleware
 * Validates JWT Bearer token supplied in Authorization header.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return sendError(
      res,
      MESSAGES.UNAUTHORIZED,
      [{ field: 'authorization', message: 'Bearer token is missing from headers.' }],
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  try {
    const decodedPayload = verifyToken(token);
    req.user = decodedPayload;
    next();
  } catch (error) {
    return sendError(
      res,
      MESSAGES.UNAUTHORIZED,
      [{ field: 'authorization', message: error.message }],
      HTTP_STATUS.UNAUTHORIZED
    );
  }
};

module.exports = authenticateToken;
