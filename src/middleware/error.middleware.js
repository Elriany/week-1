const logger = require('../utils/logger.util');
const { sendError } = require('../utils/response.util');
const HTTP_STATUS = require('../constants/httpStatus');
const MESSAGES = require('../constants/messages');

/**
 * Global Error Handler Middleware
 * Differentiates operational errors from unhandled bugs and sanitizes stack traces.
 */
const errorHandler = (err, req, res, _next) => {
  // Log error via Winston
  logger.error(err.message || MESSAGES.INTERNAL_ERROR, {
    correlationId: req.correlationId,
    stack: err.stack,
    isOperational: err.isOperational || false,
  });

  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;

  // Handle Operational vs Programming Errors
  if (err.isOperational) {
    return sendError(res, err.message, err.errors || null, statusCode);
  }

  // Never expose internal stack traces in production
  const message =
    process.env.NODE_ENV === 'development'
      ? err.message
      : MESSAGES.INTERNAL_ERROR;

  return sendError(
    res,
    message,
    [{ field: 'server', message: 'An unexpected internal server error occurred.' }],
    statusCode
  );
};

module.exports = errorHandler;
