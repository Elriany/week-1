const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Standardized success response.
 */
const sendSuccess = (res, message, data = null, statusCode = HTTP_STATUS.OK) => {
  const body = {
    success: true,
    message,
  };

  if (data !== null && data !== undefined) {
    body.data = data;
  }

  body.meta = {
    timestamp: new Date().toISOString(),
    requestId: res.req?.correlationId || 'N/A',
  };

  return res.status(statusCode).json(body);
};

/**
 * Standardized error response.
 */
const sendError = (res, message, errors = null, statusCode = HTTP_STATUS.BAD_REQUEST) => {
  const body = {
    success: false,
    message,
  };

  if (errors && (Array.isArray(errors) ? errors.length > 0 : true)) {
    body.errors = Array.isArray(errors) ? errors : [errors];
  }

  body.meta = {
    timestamp: new Date().toISOString(),
    requestId: res.req?.correlationId || 'N/A',
  };

  return res.status(statusCode).json(body);
};

/**
 * Standardized paginated response.
 */
const sendPaginated = (res, message, items, pagination) => {
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message,
    data: {
      items,
      pagination,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: res.req?.correlationId || 'N/A',
    },
  });
};

module.exports = { sendSuccess, sendError, sendPaginated };
