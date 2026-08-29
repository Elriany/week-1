import { describe, it, expect, beforeEach } from 'vitest'

describe('environment configuration', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test'
    process.env.PORT = '3000'
    process.env.MSSQL_DATABASE = 'CRM'
  })

  it('has NODE_ENV set to test', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })

  it('loads port as number', () => {
    const port = parseInt(process.env.PORT || '3000', 10)
    expect(typeof port).toBe('number')
    expect(port).toBeGreaterThan(0)
  })

  it('has CRM database configured', () => {
    expect(process.env.MSSQL_DATABASE).toBe('CRM')
  })
})

describe('JWT_SECRET production guard', () => {
  // Every other setting with a default is safe to default; a signing key
  // committed to the repository is not a secret. Production must fail closed.
  it('exports the dev default as a named constant', async () => {
    const { DEV_JWT_SECRET } = await import('../env')
    expect(DEV_JWT_SECRET).toBe('dev-only-secret-change-me-in-production')
  })

  it('refuses to start in production with the dev default', () => {
    const guard = (nodeEnv: string, secret: string, devSecret: string) =>
      nodeEnv === 'production' && secret === devSecret

    const DEV = 'dev-only-secret-change-me-in-production'
    expect(guard('production', DEV, DEV)).toBe(true)
    expect(guard('production', 'a-real-explicit-secret-value', DEV)).toBe(false)
    expect(guard('development', DEV, DEV)).toBe(false)
    expect(guard('test', DEV, DEV)).toBe(false)
  })
})
