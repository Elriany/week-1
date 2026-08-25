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

  it('check endpoint returns status up', () => {
    const result: any = {}
    mockRes.json = (data: any) => {
      Object.assign(result, data)
      return mockRes
    }

    healthController.check(mockReq, mockRes, undefined as any)

    expect(result.status).toBe('up')
  })
})
