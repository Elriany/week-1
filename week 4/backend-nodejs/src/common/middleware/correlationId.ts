import type { RequestHandler } from 'express';
import { randomUUID } from 'crypto';

export const correlationId: RequestHandler = (req, res, next) => {
  const incomingId = req.get('x-correlation-id');
  const id = incomingId || randomUUID();

  // Attach to request
  req.correlationId = id;

  // Echo on response
  res.setHeader('x-correlation-id', id);

  next();
};
