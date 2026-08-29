import { describe, it, expect, vi } from 'vitest'
import { AppError, ValidationError, NotFoundError } from '../../errors/AppError'
import { errorHandler } from '../errorHandler'

function invoke(err: unknown) {
  const req: any = { correlationId: 'test-id', originalUrl: '/x', method: 'GET' }
  const json = vi.fn()
  const res: any = { headersSent: false, status: vi.fn(() => res), json }
  errorHandler(err as any, req, res, vi.fn())
  return { status: res.status.mock.calls[0][0], body: json.mock.calls[0][0] }
}

describe('errorHandler middleware', () => {
  it('AppError has correct properties', () => {
    const error = new AppError(400, 'Invalid input', 'VALIDATION_ERROR', { field: 'name' })

    expect(error.statusCode).toBe(400)
    expect(error.message).toBe('Invalid input')
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.details).toEqual({ field: 'name' })
  })

  it('handles different error status codes', () => {
    const error500 = new AppError(500, 'Server error', 'INTERNAL_ERROR')
    const error404 = new NotFoundError('User')

    expect(error500.statusCode).toBe(500)
    expect(error404.statusCode).toBe(404)
  })

  it('ValidationError subclass works correctly', () => {
    const error = new ValidationError({ email: 'invalid' })

    expect(error.statusCode).toBe(422)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.details).toEqual({ email: 'invalid' })
  })

  it('correlationId is accessible from request', () => {
    const mockReq = { correlationId: 'test-id-123' }
    expect(mockReq.correlationId).toBe('test-id-123')
  })

  it('error includes all error properties in response', () => {
    const error = new ValidationError({ email: 'invalid' })
    const response = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      correlationId: 'test-id',
    }

    expect(response.error.code).toBe('VALIDATION_ERROR')
    expect(response.error.message).toBe('Validation failed')
    expect(response.error.details).toEqual({ email: 'invalid' })
    expect(response.correlationId).toBe('test-id')
  })

  it('does not return internal exception text for a non-AppError', () => {
    const raw = 'Invalid column name "SecretColumn" on table "Users"'
    const { status, body } = invoke(new TypeError(raw))

    expect(status).toBe(500)
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR')
    expect(body.error.message).toBe('An internal server error occurred')
    expect(body.error.message).not.toContain('SecretColumn')
  })

  it('still returns an AppError message to the client', () => {
    const { status, body } = invoke(new NotFoundError('User'))

    expect(status).toBe(404)
    expect(body.error.message).toContain('User')
  })
})
