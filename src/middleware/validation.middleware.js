const { validationResult } = require('express-validator');
const { sendError } = require('../utils/response.util');
const HTTP_STATUS = require('../constants/httpStatus');
const MESSAGES = require('../constants/messages');

/**
 * Validation Middleware
 * Formats express-validator error results into standard error envelope.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    return sendError(res, MESSAGES.VALIDATION_ERROR, formattedErrors, HTTP_STATUS.BAD_REQUEST);
  }

  next();
};

module.exports = validate;
