import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTicketMeta, resetTicketMetaCache } from '../useTicketMeta'
import { api } from '@/api/client'

vi.mock('@/api/client')

const metaResponse = {
  data: {
    statuses: [{ id: 's1', code: 'NEW', nameEn: 'New', nameAr: 'جديد' }],
    priorities: [{ id: 'p1', code: 'HIGH', nameEn: 'High', nameAr: 'عالية' }],
    categories: [{ id: 'c1', code: 'BUG', nameEn: 'Bug', nameAr: 'خلل' }],
  },
}

describe('useTicketMeta', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetTicketMetaCache()
  })

  it('issues one request when two consumers load on the same page', async () => {
    ;(api.get as any).mockResolvedValue(metaResponse)

    const a = useTicketMeta()
    const b = useTicketMeta()

    await Promise.all([a.load(), b.load()])

    expect(api.get).toHaveBeenCalledTimes(1)
    expect(a.meta.value.statuses).toHaveLength(1)
    expect(b.meta.value.statuses).toHaveLength(1)
  })

  it('serves a second consumer from cache without a second request', async () => {
    ;(api.get as any).mockResolvedValue(metaResponse)

    const a = useTicketMeta()
    await a.load()

    const b = useTicketMeta()
    await b.load()

    expect(api.get).toHaveBeenCalledTimes(1)
    expect(b.meta.value.categories).toHaveLength(1)
  })

  it('surfaces a failure to every consumer rather than leaving one hanging', async () => {
    ;(api.get as any).mockRejectedValue(new Error('network down'))

    const a = useTicketMeta()
    const b = useTicketMeta()

    const results = await Promise.allSettled([a.load(), b.load()])

    expect(results[0]!.status).toBe('rejected')
    expect(results[1]!.status).toBe('rejected')
    expect(a.error.value).not.toBe('')
    expect(b.error.value).not.toBe('')
  })
})
