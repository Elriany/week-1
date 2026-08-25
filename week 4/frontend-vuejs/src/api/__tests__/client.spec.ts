import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api } from '../client'
import { ApiError } from '@/types/api'

describe('API client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses successful response body', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ status: 'up' }),
    }
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(mockResponse)))

    const result = await api.get('/health')
    expect(result.status).toBe('up')
  })

  it('throws ApiError on error envelope', async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () =>
        Promise.resolve({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid input' },
        }),
    }
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(mockResponse)))

    try {
      await api.post('/users', {})
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
    }
  })

  it('returns null on 204 No Content', async () => {
    const mockResponse = {
      ok: true,
      status: 204,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(null),
    }
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(mockResponse)))

    const result = await api.get('/resource')
    expect(result).toBeNull()
  })

  it('throws on non-JSON content type', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      json: () => Promise.resolve({}),
    }
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(mockResponse)))

    try {
      await api.get('/health')
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
    }
  })

  it('throws when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Network error'))))

    try {
      await api.get('/health')
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
    }
  })
})
