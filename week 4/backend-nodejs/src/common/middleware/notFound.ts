import type { RequestHandler } from 'express';
import { NotFoundError } from '../errors/AppError';

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError('Route'));
};
