import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TicketsView from '../TicketsView.vue'
import { i18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/api/client'
import { resetTicketMetaCache } from '@/composables/useTicketMeta'

vi.mock('@/api/client')

const push = vi.fn()
let currentQuery: Record<string, string> = {}

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ query: currentQuery }),
  RouterLink: { template: '<a><slot /></a>' },
}))

function mountTickets() {
  return mount(TicketsView, {
    global: {
      plugins: [i18n],
      stubs: {
        // A bare `true` stub renders no slot content in this @vue/test-utils
        // version, which would hide the whole template (nearly everything
        // here lives inside BaseCard's default/header slots).
        BaseCard: { template: '<div><slot name="header" /><slot /></div>' },
        BaseButton: true,
        // BaseInput and EmptyState are simple leaf components with no
        // dependencies of their own — left un-stubbed so their real <input>
        // and title/description text are actually present in the DOM.
        BaseBadge: true,
        BaseSpinner: true,
      },
    },
  })
}

describe('TicketsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
    currentQuery = {}
    push.mockReset()
    vi.clearAllMocks()
    vi.useFakeTimers()
    // useTicketMeta caches /tickets/meta at module scope for the page lifetime;
    // each test needs a fresh fetch against its own mocked call queue.
    resetTicketMetaCache()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders one table row per returned ticket', async () => {
    const mockMeta = {
      data: {
        statuses: [{ code: 'NEW', nameEn: 'New', nameAr: 'جديد' }],
        priorities: [{ code: 'HIGH', nameEn: 'High', nameAr: 'عالية' }],
        categories: [{ code: 'BUG', nameEn: 'Bug', nameAr: 'خلل' }],
      },
    }
    const mockAssignees = { data: [] }
    const mockResponse = {
      data: {
        items: [
          { id: '1', ticketNumber: 'TKT-001', subject: 'Test', customerId: 'c1', customer: { fullNameEn: 'John', fullNameAr: 'جون' }, priority: { code: 'HIGH', nameEn: 'High', nameAr: 'عالية' }, status: { code: 'NEW', nameEn: 'New', nameAr: 'جديد' }, category: { code: 'BUG', nameEn: 'Bug', nameAr: 'خلل' }, createdAt: new Date(), updatedAt: new Date() },
          { id: '2', ticketNumber: 'TKT-002', subject: 'Test 2', customerId: 'c2', customer: { fullNameEn: 'Jane', fullNameAr: 'جين' }, priority: { code: 'HIGH', nameEn: 'High', nameAr: 'عالية' }, status: { code: 'NEW', nameEn: 'New', nameAr: 'جديد' }, category: { code: 'BUG', nameEn: 'Bug', nameAr: 'خلل' }, createdAt: new Date(), updatedAt: new Date() },
        ],
        total: 2,
      },
    }

    ;(api.get as any)
      .mockResolvedValueOnce(mockMeta)
      .mockResolvedValueOnce(mockAssignees)
      .mockResolvedValueOnce(mockResponse)

    const wrapper = mountTickets()
    await flushPromises()
    vi.runAllTimers()
    await flushPromises()

    const rows = wrapper.findAll('tr')
    // +1 for header row
    expect(rows).toHaveLength(3)
  })

  it('renders the empty state when API returns zero tickets and no search term is set', async () => {
    const mockMeta = {
      data: {
        statuses: [],
        priorities: [],
        categories: [],
      },
    }
    const mockAssignees = { data: [] }
    const mockResponse = {
      data: {
        items: [],
        total: 0,
      },
    }

    ;(api.get as any)
      .mockResolvedValueOnce(mockMeta)
      .mockResolvedValueOnce(mockAssignees)
      .mockResolvedValueOnce(mockResponse)

    const wrapper = mountTickets()
    await flushPromises()
    vi.runAllTimers()
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('No tickets yet')
  })

  it('issues one request after debounce, not one per keystroke', async () => {
    const mockMeta = {
      data: {
        statuses: [],
        priorities: [],
        categories: [],
      },
    }
    const mockAssignees = { data: [] }
    const mockResponse = {
      data: {
        items: [],
        total: 0,
      },
    }

    ;(api.get as any)
      .mockResolvedValueOnce(mockMeta)
      .mockResolvedValueOnce(mockAssignees)
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValue(mockResponse)

    const wrapper = mountTickets()
    const inputs = wrapper.findAll('input')
    const searchInput = inputs[0]

    await searchInput!.setValue('a')
    await searchInput!.setValue('ab')
    await searchInput!.setValue('abc')

    // Before debounce expires, should only have meta + assignees + initial load
    expect(api.get).toHaveBeenCalledTimes(3)

    vi.advanceTimersByTime(300)
    await flushPromises()

    // After debounce, should have 4 calls total
    expect(api.get).toHaveBeenCalledTimes(4)
  })

  it('resets page to 1 when search changes', async () => {
    const mockMeta = {
      data: {
        statuses: [],
        priorities: [],
        categories: [],
      },
    }
    const mockAssignees = { data: [] }
    const mockResponse = {
      data: {
        items: [],
        total: 0,
      },
    }

    ;(api.get as any)
      .mockResolvedValueOnce(mockMeta)
      .mockResolvedValueOnce(mockAssignees)
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValue(mockResponse)

    const wrapper = mountTickets()
    await flushPromises()
    vi.runAllTimers()
    await flushPromises()

    const vm = wrapper.vm as any
    vm.page = 2

    const inputs = wrapper.findAll('input')
    const searchInput = inputs[0]
    await searchInput!.setValue('test')

    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(vm.page).toBe(1)
  })

  it('does not overwrite results when a stale response arrives after a newer one', async () => {
    let resolveFirst: ((v: any) => void) | null = null
    let resolveSecond: ((v: any) => void) | null = null

    const firstPromise = new Promise(resolve => {
      resolveFirst = resolve
    })
    const secondPromise = new Promise(resolve => {
      resolveSecond = resolve
    })

    const mockMeta = {
      data: {
        statuses: [],
        priorities: [],
        categories: [],
      },
    }
    const mockAssignees = { data: [] }

    ;(api.get as any)
      .mockResolvedValueOnce(mockMeta)
      .mockResolvedValueOnce(mockAssignees)
      .mockResolvedValueOnce(secondPromise)
      .mockReturnValueOnce(firstPromise)

    const wrapper = mountTickets()
    await flushPromises()

    const inputs = wrapper.findAll('input')
    const searchInput = inputs[0]
    await searchInput!.setValue('a')
    vi.advanceTimersByTime(300)
    await flushPromises()

    await searchInput!.setValue('ab')
    vi.advanceTimersByTime(300)
    await flushPromises()

    resolveSecond!({
      data: {
        items: [{ id: '1', ticketNumber: 'TKT_AB', subject: 'AB', customerId: 'c1', customer: { fullNameEn: 'Test', fullNameAr: 'اختبار' }, priority: { code: 'HIGH', nameEn: 'High', nameAr: 'عالية' }, status: { code: 'NEW', nameEn: 'New', nameAr: 'جديد' }, category: { code: 'BUG', nameEn: 'Bug', nameAr: 'خلل' }, createdAt: new Date(), updatedAt: new Date() }],
        total: 1,
      },
    })
    await flushPromises()

    resolveFirst!({
      data: {
        items: [
          { id: '2', ticketNumber: 'TKT_A1', subject: 'A1', customerId: 'c1', customer: { fullNameEn: 'Test', fullNameAr: 'اختبار' }, priority: { code: 'HIGH', nameEn: 'High', nameAr: 'عالية' }, status: { code: 'NEW', nameEn: 'New', nameAr: 'جديد' }, category: { code: 'BUG', nameEn: 'Bug', nameAr: 'خلل' }, createdAt: new Date(), updatedAt: new Date() },
        ],
        total: 1,
      },
    })
    await flushPromises()

    const vm = wrapper.vm as any
    expect(vm.tickets).toHaveLength(1)
    expect(vm.tickets[0].ticketNumber).toBe('TKT_AB')
  })

  it('hides the create button without tickets.create permission', async () => {
    const mockMeta = {
      data: {
        statuses: [],
        priorities: [],
        categories: [],
      },
    }
    const mockAssignees = { data: [] }
    const mockResponse = {
      data: {
        items: [],
        total: 0,
      },
    }

    ;(api.get as any)
      .mockResolvedValueOnce(mockMeta)
      .mockResolvedValueOnce(mockAssignees)
      .mockResolvedValueOnce(mockResponse)

    const auth = useAuthStore()
    auth.user = {
      id: 'user1',
      email: 'agent@test.local',
      fullNameEn: 'Agent',
      fullNameAr: 'وكيل',
      branchId: 'branch1',
    }
    auth.permissions = ['tickets.read']

    const wrapper = mountTickets()
    await flushPromises()

    const createButtons = wrapper.findAll('button').filter(b => b.text().includes('New Ticket'))
    expect(createButtons).toHaveLength(0)
  })

  it('filters by status when status filter changes', async () => {
    const mockMeta = {
      data: {
        statuses: [{ code: 'NEW', nameEn: 'New', nameAr: 'جديد' }],
        priorities: [],
        categories: [],
      },
    }
    const mockAssignees = { data: [] }
    const mockResponse = {
      data: {
        items: [],
        total: 0,
      },
    }

    ;(api.get as any)
      .mockResolvedValue(mockMeta)
      .mockResolvedValue(mockAssignees)
      .mockResolvedValue(mockResponse)

    const wrapper = mountTickets()
    await flushPromises()

    // The filter panel is collapsed by default — open it before interacting
    // with the selects inside it.
    await wrapper.find('.filter-toggle').trigger('click')

    const vm = wrapper.vm as any
    const selects = wrapper.findAll('select')
    const statusSelect = selects[0]
    await statusSelect!.setValue('NEW')
    await flushPromises()

    expect(vm.page).toBe(1)
  })

  it('renders an SLA badge for a ticket with sla and nothing for one without', async () => {
    const mockMeta = { data: { statuses: [], priorities: [], categories: [] } }
    const mockAssignees = { data: [] }
    const mockResponse = {
      data: {
        items: [
          { id: '1', ticketNumber: 'TKT-001', subject: 'A', customerId: 'c1', customer: { fullNameEn: 'A', fullNameAr: 'أ' }, priority: { code: 'HIGH', nameEn: 'High', nameAr: 'عالية' }, status: { code: 'NEW', nameEn: 'New', nameAr: 'جديد' }, category: { code: 'BUG', nameEn: 'Bug', nameAr: 'خلل' }, sla: { status: 'ON_TRACK' }, createdAt: new Date(), updatedAt: new Date() },
          { id: '2', ticketNumber: 'TKT-002', subject: 'B', customerId: 'c2', customer: { fullNameEn: 'B', fullNameAr: 'ب' }, priority: { code: 'HIGH', nameEn: 'High', nameAr: 'عالية' }, status: { code: 'NEW', nameEn: 'New', nameAr: 'جديد' }, category: { code: 'BUG', nameEn: 'Bug', nameAr: 'خلل' }, sla: null, createdAt: new Date(), updatedAt: new Date() },
        ],
        total: 2,
      },
    }

    ;(api.get as any)
      .mockResolvedValueOnce(mockMeta)
      .mockResolvedValueOnce(mockAssignees)
      .mockResolvedValueOnce(mockResponse)

    const wrapper = mountTickets()
    await flushPromises()

    const badges = wrapper.findAllComponents({ name: 'SlaBadge' })
    expect(badges).toHaveLength(2)
    expect(badges[0]!.html().trim()).not.toBe('<!--v-if-->')
    // A null sla renders nothing — Vue's v-if leaves only an HTML comment placeholder.
    expect(badges[1]!.html().trim()).toBe('<!--v-if-->')
  })

  it('choosing an SLA filter issues one request containing slaStatus', async () => {
    const mockMeta = { data: { statuses: [], priorities: [], categories: [] } }
    const mockAssignees = { data: [] }
    const mockResponse = { data: { items: [], total: 0 } }

    ;(api.get as any)
      .mockResolvedValueOnce(mockMeta)
      .mockResolvedValueOnce(mockAssignees)
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValue(mockResponse)

    const wrapper = mountTickets()
    await flushPromises()

    await wrapper.find('.filter-toggle').trigger('click')
    const selects = wrapper.findAll('select')
    const slaSelect = selects[selects.length - 1]
    await slaSelect!.setValue('BREACHED')
    await flushPromises()

    const lastCall = (api.get as any).mock.calls.at(-1)[0]
    expect(lastCall).toContain('slaStatus=BREACHED')
  })

  it('mounting with currentQuery = { slaStatus, assignedUserId } sends both parameters on the first request', async () => {
    currentQuery = { slaStatus: 'BREACHED', assignedUserId: 'x' }
    const mockMeta = { data: { statuses: [], priorities: [], categories: [] } }
    const mockAssignees = { data: [] }
    const mockResponse = { data: { items: [], total: 0 } }

    ;(api.get as any)
      .mockResolvedValueOnce(mockMeta)
      .mockResolvedValueOnce(mockAssignees)
      .mockResolvedValueOnce(mockResponse)

    mountTickets()
    await flushPromises()

    const ticketsCall = (api.get as any).mock.calls.find((c: any[]) => c[0].startsWith('/tickets?'))
    expect(ticketsCall[0]).toContain('slaStatus=BREACHED')
    expect(ticketsCall[0]).toContain('assignedUserId=x')
  })
it('clears the create form each time the dialog is opened', async () => {
    ;(api.get as any)
      .mockResolvedValueOnce({ data: { statuses: [], priorities: [], categories: [] } })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: { items: [], total: 0 } })

    const wrapper = mountTickets()
    await flushPromises()
    vi.runAllTimers()
    await flushPromises()

    const vm = wrapper.vm as any

    vm.openCreate()
    expect(vm.showCreateDialog).toBe(true)

    // Simulate a first, abandoned attempt.
    vm.form.subject = 'Half-typed subject'
    vm.form.description = 'Half-typed description'
    vm.form.customerId = 'cust-1'
    vm.selectedCustomer = { id: 'cust-1', fullNameEn: 'John', fullNameAr: 'جون' }
    vm.showCreateDialog = false
    await flushPromises()

    vm.openCreate()
    await flushPromises()

    expect(vm.showCreateDialog).toBe(true)
    expect(vm.form.subject).toBe('')
    expect(vm.form.description).toBe('')
    // The payload sends form.customerId, so a stale one would file the new
    // ticket against the previous attempt's customer.
    expect(vm.form.customerId).toBe('')
    expect(vm.selectedCustomer).toBeNull()
  })
})
