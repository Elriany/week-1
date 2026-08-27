import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TicketsView from '../TicketsView.vue'
import { i18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/api/client'

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
        BaseCard: true,
        BaseButton: true,
        BaseInput: true,
        BaseBadge: true,
        BaseSpinner: true,
        EmptyState: true,
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

    (api.get as any)
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

    (api.get as any)
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

    (api.get as any)
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

    (api.get as any)
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

    (api.get as any)
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

    (api.get as any)
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
      permissions: ['tickets.read'],
    }

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

    (api.get as any)
      .mockResolvedValue(mockMeta)
      .mockResolvedValue(mockAssignees)
      .mockResolvedValue(mockResponse)

    const wrapper = mountTickets()
    await flushPromises()

    const vm = wrapper.vm as any
    const selects = wrapper.findAll('select')
    const statusSelect = selects[0]
    await statusSelect!.setValue('NEW')
    await flushPromises()

    expect(vm.page).toBe(1)
  })
})
