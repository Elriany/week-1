const { sendError } = require('../utils/response.util');
const HTTP_STATUS = require('../constants/httpStatus');

/**
 * 404 Not Found Middleware
 */
const notFoundHandler = (req, res, _next) => {
  return sendError(
    res,
    `Route ${req.method} ${req.originalUrl} not found.`,
    [{ field: 'url', message: 'The requested API endpoint does not exist.' }],
    HTTP_STATUS.NOT_FOUND
  );
};

module.exports = notFoundHandler;
