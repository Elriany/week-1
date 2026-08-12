const logger = require('../utils/logger.util');

/**
 * HTTP request/response logger middleware.
 * Logs method, URL, status code, and response time.
 * Never logs passwords, tokens, or sensitive data.
 */
const loggerMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      correlationId: req.correlationId,
    };

    if (req.user) {
      logData.userId = req.user.id;
      logData.role = req.user.role;
    }

    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
};

module.exports = loggerMiddleware;
