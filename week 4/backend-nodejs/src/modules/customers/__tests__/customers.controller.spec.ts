import { describe, it, expect, vi, beforeEach } from 'vitest'

// The service reaches the database; the controller contract under test does not.
vi.mock('../customers.service', () => ({
  listCustomers: vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 20 })),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  setCustomerActive: vi.fn(),
  softDeleteCustomer: vi.fn(),
  findById: vi.fn(),
  toPublicCustomer: vi.fn(),
}))

import { customersController } from '../customers.controller'

function stubReq(overrides: Record<string, unknown> = {}) {
  return {
    correlationId: 'abc',
    query: {},
    params: {},
    body: {},
    auth: { roleCode: 'ADMIN', branchId: 'b1', userId: 'u1' },
    ...overrides,
  } as any
}

describe('customersController', () => {
  let res: any
  let next: any

  beforeEach(() => {
    res = { json: vi.fn(() => res), status: vi.fn(() => res), send: vi.fn(() => res) }
    next = vi.fn()
  })

  it('returns the request correlationId on a successful list', async () => {
    await (customersController.list as any)(stubReq(), res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledTimes(1)
    expect(res.json.mock.calls[0][0]).toMatchObject({
      success: true,
      correlationId: 'abc',
    })
  })

  it('never emits an undefined correlationId', async () => {
    await (customersController.list as any)(stubReq(), res, next)

    const body = res.json.mock.calls[0][0]
    expect(body).toHaveProperty('correlationId')
    expect(body.correlationId).toBeDefined()
  })
})
