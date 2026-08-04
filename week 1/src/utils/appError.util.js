const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Custom Operational Error Class
 * Distinguishes trusted operational errors from unhandled programming bugs.
 */
class AppError extends Error {
  /**
   * @param {string} message - Error description
   * @param {number} statusCode - HTTP status code
   * @param {Array|null} errors - Specific input or field errors
   */
  constructor(message, statusCode = HTTP_STATUS.BAD_REQUEST, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true; // Flag for operational error handling

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
