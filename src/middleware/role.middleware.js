const { sendError } = require('../utils/response.util');
const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Role Authorization Middleware
 * Verifies if authenticated user has one of required roles.
 * 
 * @param {...string} allowedRoles - Authorized role names
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return sendError(res, 'User identity not found in request.', null, HTTP_STATUS.UNAUTHORIZED);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Forbidden: Role '${req.user.role}' is not authorized to perform this action.`,
        [{ field: 'role', message: `Action requires one of: ${allowedRoles.join(', ')}` }],
        HTTP_STATUS.FORBIDDEN
      );
    }

    next();
  };
};

module.exports = authorizeRoles;
