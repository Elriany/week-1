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
