import { describe, it, expect, beforeEach } from 'vitest'
import { healthController } from '../health.controller'

describe('health controller', () => {
  let mockReq: any
  let mockRes: any

  beforeEach(() => {
    mockReq = {
      correlationId: 'test-id',
    }
    mockRes = {
      status: undefined,
      json: undefined,
    }
  })

  // Mounted at /api/v1/health, so it uses the same envelope as the rest of the
  // versioned API. The bare `{ status: 'up' }` probe lives at /health.
  it('check endpoint returns status up inside the standard envelope', () => {
    const result: any = {}
    mockRes.json = (data: any) => {
      Object.assign(result, data)
      return mockRes
    }

    healthController.check(mockReq, mockRes, undefined as any)

    expect(result.success).toBe(true)
    expect(result.data.status).toBe('up')
    expect(result.correlationId).toBe('test-id')
  })
})
