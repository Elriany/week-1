const { verifyToken } = require('../utils/jwt.util');
const { sendError } = require('../utils/response.util');
const HTTP = require('../constants/httpStatus');
const MSG = require('../constants/messages');

/**
 * JWT authentication middleware.
 * Extracts and verifies Bearer token, attaches decoded user to req.user.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return sendError(res, MSG.UNAUTHORIZED, null, HTTP.UNAUTHORIZED);
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? MSG.TOKEN_EXPIRED : MSG.UNAUTHORIZED;
    return sendError(res, message, null, HTTP.UNAUTHORIZED);
  }
};

module.exports = authenticate;
