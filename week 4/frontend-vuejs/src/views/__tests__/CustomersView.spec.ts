import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import CustomersView from '../CustomersView.vue'
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

function mountCustomers() {
  return mount(CustomersView, {
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

describe('CustomersView', () => {
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

  it('renders one table row per returned customer', async () => {
    const mockResponse = {
      data: {
        items: [
          { id: '1', code: 'CUST001', fullNameEn: 'John', fullNameAr: 'جون', email: 'john@example.com', phone: '+966501234567', preferredLanguage: 'en', isActive: true, branchId: 'b1', createdAt: new Date(), updatedAt: new Date() },
          { id: '2', code: 'CUST002', fullNameEn: 'Jane', fullNameAr: 'جين', email: 'jane@example.com', phone: '+966502345678', preferredLanguage: 'ar', isActive: true, branchId: 'b1', createdAt: new Date(), updatedAt: new Date() },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      },
    };

    ;(api.get as any).mockResolvedValue(mockResponse)

    const wrapper = mountCustomers()
    await flushPromises()
    vi.runAllTimers()
    await flushPromises()

    const rows = wrapper.findAll('tr')
    // +1 for header row
    expect(rows).toHaveLength(3)
  })

  it('renders the empty state when API returns zero customers and no search term is set', async () => {
    const mockResponse = {
      data: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      },
    };

    ;(api.get as any).mockResolvedValue(mockResponse)

    const wrapper = mountCustomers()
    await flushPromises()
    vi.runAllTimers()
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('No customers yet')
  })

  it('renders the no-results state when a search term is set and zero come back', async () => {
    const mockResponse = {
      data: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      },
    };

    ;(api.get as any).mockResolvedValue(mockResponse)

    const wrapper = mountCustomers()
    const inputs = wrapper.findAll('input')
    const searchInput = inputs[0]

    await searchInput!.setValue('nonexistent')
    vi.advanceTimersByTime(300)
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('No customers found')
  })

  it('issues one request after debounce, not one per keystroke', async () => {
    const mockResponse = {
      data: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      },
    };

    ;(api.get as any).mockResolvedValue(mockResponse)

    const wrapper = mountCustomers()
    const inputs = wrapper.findAll('input')
    const searchInput = inputs[0]

    await searchInput!.setValue('a')
    await searchInput!.setValue('ab')
    await searchInput!.setValue('abc')

    // Before debounce expires, should only have initial load call
    expect(api.get).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(300)
    await flushPromises()

    // After debounce, should have 2 calls total (initial + search)
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('resets page to 1 when search changes', async () => {
    const mockResponse = {
      data: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      },
    };

    ;(api.get as any).mockResolvedValue(mockResponse)

    const wrapper = mountCustomers()
    await flushPromises()
    vi.runAllTimers()
    await flushPromises()

    // Manually set page to 2 (simulating user navigating)
    const vm = wrapper.vm as any
    vm.page = 2

    // Now search
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

    ;(api.get as any)
      // The component fetches once on mount. Without this the two queued
      // promises shift by one and the assertion measures the wrong request.
      .mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, pageSize: 20 } })
      .mockReturnValueOnce(firstPromise)
      .mockReturnValueOnce(secondPromise)

    const wrapper = mountCustomers()
    await flushPromises()

    // First request: search for "a"
    const inputs = wrapper.findAll('input')
    const searchInput = inputs[0]
    await searchInput!.setValue('a')
    vi.advanceTimersByTime(300)
    await flushPromises()

    // Second request: search for "ab" (first request still pending)
    await searchInput!.setValue('ab')
    vi.advanceTimersByTime(300)
    await flushPromises()

    // Resolve second request first
    resolveSecond!({
      data: {
        items: [{ id: '1', code: 'CUST_AB', fullNameEn: 'AB Customer', fullNameAr: 'عميل AB', email: '', phone: '', preferredLanguage: 'en', isActive: true, branchId: '', createdAt: new Date(), updatedAt: new Date() }],
        total: 1,
        page: 1,
        pageSize: 20,
      },
    })
    await flushPromises()

    // Then resolve first request
    resolveFirst!({
      data: {
        items: [
          { id: '1', code: 'CUST_A1', fullNameEn: 'A1 Customer', fullNameAr: 'عميل A1', email: '', phone: '', preferredLanguage: 'en', isActive: true, branchId: '', createdAt: new Date(), updatedAt: new Date() },
          { id: '2', code: 'CUST_A2', fullNameEn: 'A2 Customer', fullNameAr: 'عميل A2', email: '', phone: '', preferredLanguage: 'en', isActive: true, branchId: '', createdAt: new Date(), updatedAt: new Date() },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      },
    })
    await flushPromises()

    const vm = wrapper.vm as any
    // Should have AB result (newer), not A1/A2 (stale)
    expect(vm.customers).toHaveLength(1)
    expect(vm.customers[0].code).toBe('CUST_AB')
  })

  it('hides the create button without customers.create permission', async () => {
    const mockResponse = {
      data: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      },
    };

    ;(api.get as any).mockResolvedValue(mockResponse)

    const auth = useAuthStore()
    auth.user = {
      id: 'user1',
      email: 'agent@test.local',
      fullNameEn: 'Agent',
      fullNameAr: 'وكيل',
      branchId: 'branch1',
    }
    auth.permissions = ['customers.read'] // No create permission

    const wrapper = mountCustomers()
    await flushPromises()

    const createButtons = wrapper.findAll('button').filter(b => b.text().includes('Add customer'))
    expect(createButtons).toHaveLength(0)
  })

  it("renders code as a link to customer-detail route", async () => {
    const mockResponse = {
      data: {
        items: [
          { id: '1', code: 'CUST001', fullNameEn: 'John', fullNameAr: 'جون', email: 'john@example.com', phone: '+966501234567', preferredLanguage: 'en', isActive: true, branchId: 'b1', createdAt: new Date(), updatedAt: new Date() },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      },
    };

    ;(api.get as any).mockResolvedValue(mockResponse)

    const wrapper = mountCustomers()
    await flushPromises()
    vi.runAllTimers()
    await flushPromises()

    const links = wrapper.findAll('a')
    const codeLink = links.find(l => l.text().includes('CUST001'))
    expect(codeLink).toBeDefined()
  })

  it('asks for confirmation before deleting', async () => {
    const mockResponse = {
      data: {
        items: [
          { id: '1', code: 'CUST001', fullNameEn: 'John', fullNameAr: 'جون', email: 'john@example.com', phone: '+966501234567', preferredLanguage: 'en', isActive: true, branchId: 'b1', createdAt: new Date(), updatedAt: new Date() },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      },
    };

    ;(api.get as any).mockResolvedValue(mockResponse)
    ;(api.delete as any).mockResolvedValue({ status: 204 })

    const auth = useAuthStore()
    auth.user = {
      id: 'user1',
      email: 'admin@test.local',
      fullNameEn: 'Admin',
      fullNameAr: 'إداري',
      branchId: 'branch1',
    }
    auth.permissions = ['customers.read', 'customers.delete']

    const wrapper = mountCustomers()
    await flushPromises()
    vi.runAllTimers()
    await flushPromises()

    const vm = wrapper.vm as any
    const customer = vm.customers[0]

    // Click delete button
    const deleteButtons = wrapper.findAll('button').filter(b => b.text().includes('Delete'))
    if (deleteButtons.length > 0) {
      await deleteButtons[0]!.trigger('click')
      await flushPromises()

      // Modal should be shown
      expect(vm.deleteModal.show).toBe(true)
      expect(vm.deleteModal.customer?.id).toBe(customer.id)

      // Confirm delete
      const confirmButtons = wrapper.findAll('button').filter(b => b.text().includes('Delete'))
      if (confirmButtons.length > 1) {
        await confirmButtons[confirmButtons.length - 1]!.trigger('click')
        await flushPromises()

        expect(api.delete).toHaveBeenCalledWith(`/customers/${customer.id}`)
      }
    }
  })
})
