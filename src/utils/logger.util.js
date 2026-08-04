const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, correlationId, method, url, status, responseTime, ip, userId, stack }) => {
    let logLine = `[${timestamp}] [${level.toUpperCase()}]`;

    if (correlationId) {
      logLine += ` [CID:${correlationId}]`;
    }

    if (method && url) {
      logLine += ` ${method} ${url}`;
    }

    if (status !== undefined) {
      logLine += ` | Status: ${status}`;
    }

    if (responseTime !== undefined) {
      logLine += ` | Time: ${responseTime}ms`;
    }

    if (ip) {
      logLine += ` | IP: ${ip}`;
    }

    if (userId) {
      logLine += ` | User:${userId}`;
    }

    if (message) {
      logLine += ` | ${message}`;
    }

    if (stack) {
      logLine += `\nStack: ${stack}`;
    }

    return logLine;
  })
);

// Create Winston Logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    // Write all logs with level 'info' and below to app.log
    new winston.transports.File({ filename: path.join(logsDir, 'app.log') }),
    // Write error logs to error.log
    new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
    // Write to console in development
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),
  ],
});

module.exports = logger;
