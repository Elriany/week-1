const { v4: uuidv4 } = require('uuid');

/**
 * Correlation ID Middleware
 * Ensures every incoming HTTP request is tagged with a unique tracing identifier.
 */
const correlationIdMiddleware = (req, res, next) => {
  // Check if client supplied x-correlation-id in headers
  const existingCorrelationId = req.headers['x-correlation-id'] || req.headers['X-Correlation-Id'];
  
  // Use existing or generate a new UUID v4
  const correlationId = existingCorrelationId || uuidv4();

  // Attach to request object
  req.correlationId = correlationId;

  // Set response header
  res.setHeader('X-Correlation-Id', correlationId);

  next();
};

module.exports = correlationIdMiddleware;
