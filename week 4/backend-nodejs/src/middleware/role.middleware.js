const { sendError } = require('../utils/response.util');
const HTTP = require('../constants/httpStatus');
const MSG = require('../constants/messages');

/**
 * Role-based authorization middleware factory.
 * Usage: authorizeRoles('ADMIN', 'MANAGER')
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return sendError(res, MSG.FORBIDDEN, null, HTTP.FORBIDDEN);
    }
    next();
  };
};

module.exports = authorizeRoles;
