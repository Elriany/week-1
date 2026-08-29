import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AuditView from '../AuditView.vue'
import { i18n } from '@/i18n'
import { api } from '@/api/client'

vi.mock('@/api/client')

vi.mock('vue-router', () => ({
  RouterLink: { props: ['to'], template: '<a :data-to="JSON.stringify(to)"><slot /></a>' },
}))

function mountView() {
  return mount(AuditView, {
    global: {
      plugins: [i18n],
      stubs: {
        BaseCard: { template: '<div><slot name="header" /><slot /></div>' },
        BaseButton: { template: '<button v-bind="$attrs"><slot /></button>' },
        BaseSpinner: true,
        EmptyState: true,
      },
    },
  })
}

const entries = [
  {
    id: 'a1',
    action: 'TICKET_CREATED',
    entityType: 'Ticket',
    entityId: 'ticket-1',
    summary: 'TKT-001 created',
    details: { subject: 'Cannot log in' },
    actor: { id: 'u1', fullNameEn: 'Agent Smith', fullNameAr: 'وكيل' },
    createdAt: new Date('2026-08-20T10:00:00Z'),
  },
  {
    id: 'a2',
    action: 'CONFIG_UPDATED',
    entityType: 'Branch',
    entityId: 'branch-1',
    summary: 'HQ updated',
    details: null,
    actor: null,
    createdAt: new Date('2026-08-19T10:00:00Z'),
  },
]

function usersResponse() {
  return { data: [{ id: 'u1', fullNameEn: 'Agent Smith', fullNameAr: 'وكيل' }] }
}

describe('AuditView', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en'
    vi.clearAllMocks()
  })

  it('renders one row per entry, newest first as returned by the API', async () => {
    ;(api.get as any).mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/users')) return Promise.resolve(usersResponse())
      return Promise.resolve({ data: { items: entries, total: 2, page: 1, pageSize: 25 } })
    })

    const wrapper = mountView()
    await flushPromises()

    const rows = wrapper.findAll('tbody tr:not(.details-row)')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('TKT-001 created')
    expect(rows[1]!.text()).toContain('HQ updated')
  })

  it('links a Ticket row to ticket-detail and does not link a Branch row', async () => {
    ;(api.get as any).mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/users')) return Promise.resolve(usersResponse())
      return Promise.resolve({ data: { items: entries, total: 2, page: 1, pageSize: 25 } })
    })

    const wrapper = mountView()
    await flushPromises()

    const link = wrapper.find('a[data-to]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('data-to')).toContain('ticket-1')

    const rows = wrapper.findAll('tbody tr:not(.details-row)')
    expect(rows[1]!.find('a').exists()).toBe(false)
  })

  it('renders an em dash for null details and formatted JSON for an object', async () => {
    ;(api.get as any).mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/users')) return Promise.resolve(usersResponse())
      return Promise.resolve({ data: { items: entries, total: 2, page: 1, pageSize: 25 } })
    })

    const wrapper = mountView()
    await flushPromises()

    const expandButtons = wrapper.findAll('.expand-button')
    await expandButtons[0]!.trigger('click')
    expect(wrapper.find('pre').text()).toContain('"subject"')

    await expandButtons[0]!.trigger('click')
    await expandButtons[1]!.trigger('click')
    expect(wrapper.text()).toContain('No details')
  })

  it('falls back to the raw code for an unknown action', async () => {
    const unknownEntry = { ...entries[0], action: 'SOME_FUTURE_ACTION' }
    ;(api.get as any).mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/users')) return Promise.resolve(usersResponse())
      return Promise.resolve({ data: { items: [unknownEntry], total: 1, page: 1, pageSize: 25 } })
    })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('SOME_FUTURE_ACTION')
  })

  it('applying filters issues exactly one request with the applied parameters', async () => {
    ;(api.get as any).mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/users')) return Promise.resolve(usersResponse())
      return Promise.resolve({ data: { items: [], total: 0, page: 1, pageSize: 25 } })
    })

    const wrapper = mountView()
    await flushPromises()
    const callsAfterMount = (api.get as any).mock.calls.length

    const selects = wrapper.findAll('select')
    await selects[0]!.setValue('Ticket')
    await selects[1]!.setValue('TICKET_CREATED')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect((api.get as any).mock.calls.length).toBe(callsAfterMount + 1)
    const lastCall = (api.get as any).mock.calls[(api.get as any).mock.calls.length - 1][0]
    expect(lastCall).toContain('entityType=Ticket')
    expect(lastCall).toContain('action=TICKET_CREATED')
  })

  it('paging issues one request and preserves the filters', async () => {
    ;(api.get as any).mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/users')) return Promise.resolve(usersResponse())
      return Promise.resolve({ data: { items: entries, total: 50, page: 1, pageSize: 25 } })
    })

    const wrapper = mountView()
    await flushPromises()

    const selects = wrapper.findAll('select')
    await selects[0]!.setValue('Ticket')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    const callsAfterFilter = (api.get as any).mock.calls.length

    const nextButton = wrapper.findAll('button').find(b => b.text() === 'Next')
    await nextButton!.trigger('click')
    await flushPromises()

    expect((api.get as any).mock.calls.length).toBe(callsAfterFilter + 1)
    const lastCall = (api.get as any).mock.calls[(api.get as any).mock.calls.length - 1][0]
    expect(lastCall).toContain('entityType=Ticket')
    expect(lastCall).toContain('page=2')
  })
})
