const HTTP_STATUS = require('../constants/httpStatus');
const CONFIG_CONSTANTS = require('../config/constants');

/**
 * Creates standardized response metadata block.
 * @param {Object} req - Express request object
 */
const createMeta = (req) => ({
  timestamp: new Date().toISOString(),
  correlationId: req ? req.correlationId || 'N/A' : 'N/A',
  version: CONFIG_CONSTANTS.API_VERSION,
});

/**
 * Sends a standardized success JSON response with metadata.
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Object|Array|null} data - Response data payload
 * @param {number} statusCode - HTTP status code
 */
const sendSuccess = (res, message, data = null, statusCode = HTTP_STATUS.OK) => {
  const responseObj = {
    success: true,
    message,
  };

  if (data !== null && data !== undefined) {
    responseObj.data = data;
  }

  responseObj.meta = createMeta(res.req);

  return res.status(statusCode).json(responseObj);
};

/**
 * Sends a standardized error JSON response with metadata.
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Array|null} errors - Error detail array
 * @param {number} statusCode - HTTP status code
 */
const sendError = (res, message, errors = null, statusCode = HTTP_STATUS.BAD_REQUEST) => {
  const responseObj = {
    success: false,
    status: statusCode,
    message,
  };

  if (errors !== null && errors !== undefined && errors.length > 0) {
    responseObj.errors = errors;
  }

  responseObj.meta = createMeta(res.req);

  return res.status(statusCode).json(responseObj);
};

module.exports = {
  sendSuccess,
  sendError,
};
