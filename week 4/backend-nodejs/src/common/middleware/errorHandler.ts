import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Guard re-entry: if headers were already sent, delegate to Express
  if (res.headersSent) {
    return _next(err);
  }

  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An internal server error occurred';
  let details: unknown;
  let stack: string | undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
    stack = err.stack;
  } else if (err instanceof Error) {
    stack = err.stack;
    message = err.message || message;
  }

  // Log the full error with stack and correlation ID
  logger.error('Request error', {
    correlationId: req.correlationId,
    statusCode,
    code,
    message,
    stack,
    url: req.originalUrl,
    method: req.method,
  });

  // Build response envelope
  const body: any = {
    success: false,
    error: {
      code,
      message,
    },
    correlationId: req.correlationId,
  };

  if (details !== undefined) {
    body.error.details = details;
  }

  // Include stack only in development
  if (process.env.NODE_ENV !== 'production' && stack) {
    body.error.stack = stack;
  }

  res.status(statusCode).json(body);
};
