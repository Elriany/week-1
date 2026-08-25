export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) { super(404, resource + ' not found', 'NOT_FOUND'); }
}

export class ValidationError extends AppError {
  constructor(details: unknown) { super(422, 'Validation failed', 'VALIDATION_ERROR', details); }
}

export class ConflictError extends AppError {
  constructor(message: string) { super(409, message, 'CONFLICT'); }
}
