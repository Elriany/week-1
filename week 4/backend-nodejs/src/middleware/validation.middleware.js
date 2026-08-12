const { validationResult } = require('express-validator');
const { sendError } = require('../utils/response.util');
const HTTP = require('../constants/httpStatus');
const MSG = require('../constants/messages');

/**
 * Runs after express-validator checks.
 * If errors exist, returns 422 with structured validation messages.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    return sendError(res, MSG.VALIDATION_ERROR, formatted, HTTP.UNPROCESSABLE_ENTITY);
  }
  next();
};

module.exports = validate;
