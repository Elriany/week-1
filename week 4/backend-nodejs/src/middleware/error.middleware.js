const logger = require('../utils/logger.util');
const { sendError } = require('../utils/response.util');
const HTTP = require('../constants/httpStatus');
const MSG = require('../constants/messages');

/**
 * Global error-handling middleware.
 * Catches AppError (operational) and unexpected errors.
 * Never exposes internal SQL or stack details to the client.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    correlationId: req.correlationId,
    url: req.originalUrl,
    method: req.method,
  });

  if (err.isOperational) {
    return sendError(res, err.message, err.errors, err.statusCode);
  }

  return sendError(res, MSG.INTERNAL_ERROR, null, HTTP.INTERNAL_SERVER_ERROR);
};

module.exports = errorHandler;
