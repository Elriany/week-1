const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/response.util');
const HTTP_STATUS = require('../constants/httpStatus');
const MESSAGES = require('../constants/messages');

/**
 * Rate Limiting Middleware
 * Restricts client IP requests to 100 requests per 1 minute window.
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    return sendError(
      res,
      MESSAGES.TOO_MANY_REQUESTS,
      [{ field: 'rate_limit', message: 'Rate limit exceeded. Capped at 100 requests per minute.' }],
      HTTP_STATUS.TOO_MANY_REQUESTS
    );
  },
});

module.exports = apiLimiter;
