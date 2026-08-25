import type { RequestHandler } from 'express';
import { ZodType } from 'zod';
import { ValidationError } from '../errors/AppError';

interface Schemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

export const validate = (schemas: Schemas): RequestHandler => (req, _res, next) => {
  for (const key of ['body', 'params', 'query'] as const) {
    const schema = schemas[key];
    if (!schema) continue;

    const result = schema.safeParse(req[key]);
    if (!result.success) {
      return next(new ValidationError(result.error.format()));
    }

    // Replace the request property with the validated and coerced value
    Object.defineProperty(req, key, { value: result.data, writable: true });
  }

  next();
};
