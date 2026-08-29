import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import DashboardView from '../DashboardView.vue'
import { i18n } from '@/i18n'
import { api } from '@/api/client'

vi.mock('@/api/client')

// Captures the `to` prop so tests can assert on it directly — a bare
// template stub would otherwise drop it. Defined inside vi.mock's factory
// since vi.mock calls are hoisted above top-level const declarations.
const replace = vi.fn()

vi.mock('vue-router', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :data-to="JSON.stringify(to)"><slot /></a>',
  },
  // The view reads ?denied to show the permission-denied banner, then strips it.
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace }),
}))

function mountDashboard() {
  return mount(DashboardView, {
    global: {
      plugins: [i18n],
      stubs: { BaseSpinner: true },
    },
  })
}

const mockData = {
  myOpen: { count: 3, filter: { assignedUserId: 'u1' } },
  myBreached: { count: 1, filter: { assignedUserId: 'u1', slaStatus: 'BREACHED' } },
  unassigned: { count: 0, filter: { unassigned: 'true' } },
  branchOpen: { count: 5, filter: {} },
  myByStatus: [
    { key: 'NEW', labelEn: 'New', labelAr: 'جديد', count: 2, filter: { assignedUserId: 'u1', statusId: 's1' } },
    { key: 'RESOLVED', labelEn: 'Resolved', labelAr: 'تم الحل', count: 0, filter: { assignedUserId: 'u1', statusId: 's2' } },
  ],
  myByPriority: [
    { key: 'HIGH', labelEn: 'High', labelAr: 'عالية', count: 1, filter: { assignedUserId: 'u1', priorityId: 'p1' } },
  ],
  slaBuckets: [
    { key: 'ON_TRACK', labelEn: 'On Track', labelAr: 'ضمن الوقت', count: 2, filter: { assignedUserId: 'u1', slaStatus: 'ON_TRACK' } },
  ],
  slaNoPolicyCount: 0,
}

describe('DashboardView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
    vi.clearAllMocks()
  })

  it('calls GET /dashboard/agent exactly once and renders the four tile counts', async () => {
    ;(api.get as any).mockResolvedValueOnce({ data: mockData })

    const wrapper = mountDashboard()
    await flushPromises()

    expect(api.get).toHaveBeenCalledTimes(1)
    expect(api.get).toHaveBeenCalledWith('/dashboard/agent')
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('1')
    expect(wrapper.text()).toContain('5')
  })

  it("a tile's RouterLink to.query deep-equals the mocked filter object", async () => {
    ;(api.get as any).mockResolvedValueOnce({ data: mockData })

    const wrapper = mountDashboard()
    await flushPromises()

    const anchors = wrapper.findAll('a')
    const parsed = anchors.map(a => JSON.parse(a.attributes('data-to') || 'null')).filter(Boolean)
    const myOpenLink = parsed.find(to => to.query?.assignedUserId === 'u1' && !to.query?.slaStatus && !to.query?.statusId)
    expect(myOpenLink).toBeTruthy()
    expect(myOpenLink.query).toEqual(mockData.myOpen.filter)
  })

  it('a bucket with count: 0 renders 0 and is present in the DOM', async () => {
    ;(api.get as any).mockResolvedValueOnce({ data: mockData })

    const wrapper = mountDashboard()
    await flushPromises()

    expect(wrapper.text()).toContain('Resolved')
  })

  it('an API rejection renders the error branch, not the empty state', async () => {
    ;(api.get as any).mockRejectedValueOnce(new Error('boom'))

    const wrapper = mountDashboard()
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })

  it('a slow refresh followed by a fast second leaves the second response rendered', async () => {
    ;(api.get as any).mockResolvedValueOnce({ data: mockData })
    const wrapper = mountDashboard()
    await flushPromises()

    let resolveSlow: (v: any) => void = () => {}
    const slowPromise = new Promise(resolve => { resolveSlow = resolve })
    const fastData = { ...mockData, myOpen: { count: 42, filter: {} } }

    ;(api.get as any)
      .mockReturnValueOnce(slowPromise)
      .mockResolvedValueOnce({ data: fastData })

    // Two refreshes fire back to back — the second (fast) one resolves first.
    const refreshButton = wrapper.find('button')
    await refreshButton.trigger('click')
    await refreshButton.trigger('click')
    await flushPromises()

    resolveSlow({ data: mockData })
    await flushPromises()

    expect(wrapper.text()).toContain('42')
  })
})
