const logger = require('../utils/logger.util');

/**
 * Winston HTTP Logger Middleware
 * Intercepts request completion to log HTTP performance, IP, User ID, and Correlation ID.
 */
const loggerMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const userId = req.user ? `${req.user.id}(${req.user.role})` : 'Unauthenticated';

    logger.info(`HTTP Request completed`, {
      correlationId: req.correlationId,
      method: req.method,
      url: req.originalUrl,
      status: statusCode,
      responseTime: duration,
      ip: clientIp,
      userId,
    });
  });

  next();
};

module.exports = loggerMiddleware;
