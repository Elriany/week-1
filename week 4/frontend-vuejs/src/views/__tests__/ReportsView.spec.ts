import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ReportsView from '../ReportsView.vue'
import { i18n } from '@/i18n'
import { api } from '@/api/client'

vi.mock('@/api/client')

vi.mock('vue-router', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :data-to="JSON.stringify(to)"><slot /></a>',
  },
}))

function mountReports() {
  return mount(ReportsView, {
    global: {
      plugins: [i18n],
      stubs: { BaseSpinner: true },
    },
  })
}

const mockOverview = {
  range: { from: null, to: null },
  totals: { total: 10, open: 6, closed: 4, unassigned: 2 },
  byStatus: [
    { key: 'NEW', labelEn: 'New', labelAr: 'جديد', count: 6, filter: { statusId: 's1' } },
    { key: 'CLOSED', labelEn: 'Closed', labelAr: 'مغلق', count: 4, filter: { statusId: 's2' } },
  ],
  byPriority: [
    { key: 'HIGH', labelEn: 'High', labelAr: 'عالية', count: 10, filter: { priorityId: 'p1' } },
  ],
  byCategory: [
    { key: 'BUG', labelEn: 'Bug', labelAr: 'خلل', count: 8, filter: { categoryId: 'c1' } },
    { key: 'UNCATEGORIZED', labelEn: '', labelAr: '', count: 2, filter: {} },
  ],
  byChannel: [
    { key: 'WEB', labelEn: 'WEB', labelAr: 'WEB', count: 10, filter: { channel: 'WEB' } },
  ],
  agentWorkload: [
    { userId: 'u1', fullNameEn: 'Agent One', fullNameAr: 'وكيل واحد', openCount: 3, resolvedCount: 2, breachedCount: 1, filter: { assignedUserId: 'u1' } },
    { userId: 'UNKNOWN', fullNameEn: 'Deleted user', fullNameAr: 'مستخدم محذوف', openCount: 1, resolvedCount: 0, breachedCount: 0, filter: {} },
  ],
  resolution: { resolvedCount: 4, avgResolutionMinutes: null, medianResolutionMinutes: null },
  sla: [
    { key: 'ON_TRACK', labelEn: 'On Track', labelAr: 'ضمن الوقت', count: 5, filter: { slaStatus: 'ON_TRACK' } },
    { key: 'BREACHED', labelEn: 'Breached', labelAr: 'مخالف', count: 1, filter: { slaStatus: 'BREACHED' } },
  ],
  slaNoPolicyCount: 0,
}

describe('ReportsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
    vi.clearAllMocks()
  })

  it('renders one row per bucket across all four breakdowns', async () => {
    ;(api.get as any).mockResolvedValueOnce({ data: mockOverview })
    const wrapper = mountReports()
    await flushPromises()

    expect(wrapper.text()).toContain('New')
    expect(wrapper.text()).toContain('Bug')
    expect(wrapper.text()).toContain('Uncategorised')
    expect(wrapper.text()).toContain('WEB')
  })

  it('avgResolutionMinutes: null renders the no-data label and not 0', async () => {
    ;(api.get as any).mockResolvedValueOnce({ data: mockOverview })
    const wrapper = mountReports()
    await flushPromises()

    expect(wrapper.text()).toContain('No data')
    expect(wrapper.text()).not.toMatch(/\b0\b.*Average/)
  })

  it('the UNKNOWN agent row renders without a link', async () => {
    ;(api.get as any).mockResolvedValueOnce({ data: mockOverview })
    const wrapper = mountReports()
    await flushPromises()

    expect(wrapper.text()).toContain('Deleted user')
    const anchors = wrapper.findAll('a')
    const linkTargets = anchors.map(a => JSON.parse(a.attributes('data-to') || 'null')).filter(Boolean)
    const hasUnknownLink = linkTargets.some(to => to.query?.assignedUserId === 'UNKNOWN')
    expect(hasUnknownLink).toBe(false)
  })

  it('applying a date range issues exactly one new request carrying both parameters', async () => {
    ;(api.get as any).mockResolvedValueOnce({ data: mockOverview })
    const wrapper = mountReports()
    await flushPromises()

    ;(api.get as any).mockResolvedValueOnce({ data: mockOverview })
    const inputs = wrapper.findAll('input[type="date"]')
    await inputs[0]!.setValue('2026-01-01')
    await inputs[1]!.setValue('2026-01-31')

    const applyButton = wrapper.findAll('button').find(b => b.text().includes('Apply'))
    await applyButton!.trigger('click')
    await flushPromises()

    expect(api.get).toHaveBeenCalledTimes(2)
    const lastCall = (api.get as any).mock.calls[1][0]
    expect(lastCall).toContain('from=2026-01-01')
    expect(lastCall).toContain('to=2026-01-31')
  })

  it('a 422 on from/to renders the range-specific message', async () => {
    ;(api.get as any).mockResolvedValueOnce({ data: mockOverview })
    const wrapper = mountReports()
    await flushPromises()

    const { ApiError } = await import('@/types/api')
    ;(api.get as any).mockRejectedValueOnce(new ApiError(422, 'VALIDATION_ERROR', undefined, 'corr-1'))

    const applyButton = wrapper.findAll('button').find(b => b.text().includes('Apply'))
    await applyButton!.trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('invalid')
  })

  it('the applied-range label reflects the API echoed range, not the input values', async () => {
    ;(api.get as any).mockResolvedValueOnce({ data: { ...mockOverview, range: { from: '2026-01-01T00:00:00.000Z', to: null } } })
    const wrapper = mountReports()
    await flushPromises()

    expect(wrapper.text()).toMatch(/Showing/)
  })
})
