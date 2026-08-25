import { describe, it, expect } from 'vitest'
import { AppError, ValidationError, NotFoundError } from '../../errors/AppError'

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
})
