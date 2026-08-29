import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PortalTicketsView from '../PortalTicketsView.vue'
import { i18n } from '@/i18n'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'
import { resetTicketMetaCache } from '@/composables/useTicketMeta'

vi.mock('@/api/client')

const push = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  RouterLink: { template: '<a><slot /></a>' },
}))

function mountView() {
  return mount(PortalTicketsView, {
    global: {
      plugins: [i18n],
      stubs: {
        BaseCard: { template: '<div><slot name="header" /><slot /></div>' },
        BaseButton: { template: '<button><slot /></button>' },
        BaseBadge: true,
        BaseSpinner: true,
        SlaBadge: true,
      },
    },
  })
}

const emptyMeta = { data: { statuses: [], priorities: [], categories: [] } }

function ticketsPage(items: any[], total: number) {
  return { data: { items, total, page: 1, pageSize: 20 } }
}

describe('PortalTicketsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
    push.mockReset()
    vi.clearAllMocks()
    vi.useFakeTimers()
    resetTicketMetaCache()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders one row per ticket with an SLA badge and no assignee column', async () => {
    ;(api.get as any).mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/tickets/meta')) return Promise.resolve(emptyMeta)
      return Promise.resolve(
        ticketsPage(
          [
            {
              id: 't1',
              ticketNumber: 'TKT-001',
              subject: 'Cannot log in',
              status: { code: 'NEW', nameEn: 'New', nameAr: 'جديد' },
              sla: { status: 'ON_TRACK' },
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          1,
        ),
      )
    })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('TKT-001')
    expect(wrapper.text()).toContain('Cannot log in')
    expect(wrapper.text()).not.toContain('Assigned to')
    expect(wrapper.html().toLowerCase()).toContain('sla-badge')
  })

  it('renders the unlinked state on 403, not the generic error banner', async () => {
    ;(api.get as any).mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/tickets/meta')) return Promise.resolve(emptyMeta)
      return Promise.reject(new ApiError(403, 'FORBIDDEN'))
    })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Account not linked')
    expect(wrapper.text()).not.toContain('Cannot reach the server')
  })

  it('renders the error banner on a 500, not the unlinked state', async () => {
    ;(api.get as any).mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/tickets/meta')) return Promise.resolve(emptyMeta)
      return Promise.reject(new ApiError(500, 'INTERNAL'))
    })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Account not linked')
    expect(wrapper.text()).toContain('Cannot reach the server')
  })

  it('renders the empty state distinct from the unlinked state', async () => {
    ;(api.get as any).mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/tickets/meta')) return Promise.resolve(emptyMeta)
      return Promise.resolve(ticketsPage([], 0))
    })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('No tickets yet')
    expect(wrapper.text()).not.toContain('Account not linked')
  })

  it('debounces search and resets to page 1', async () => {
    ;(api.get as any).mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/tickets/meta')) return Promise.resolve(emptyMeta)
      return Promise.resolve(ticketsPage([], 0))
    })

    const wrapper = mountView()
    await flushPromises()
    const callsAfterMount = (api.get as any).mock.calls.length

    const input = wrapper.find('input[type="search"]')
    await input.setValue('a')
    await input.setValue('ab')

    expect((api.get as any).mock.calls.length).toBe(callsAfterMount)

    vi.advanceTimersByTime(300)
    await flushPromises()

    expect((api.get as any).mock.calls.length).toBe(callsAfterMount + 1)

    const vm = wrapper.vm as any
    expect(vm.page).toBe(1)
  })
})
