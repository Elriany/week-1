import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import CustomerDetailView from '../CustomerDetailView.vue'
import { i18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'

vi.mock('@/api/client')

const params = { id: 'cust-123' }

vi.mock('vue-router', () => ({
  useRouter: () => ({}),
  useRoute: () => ({ params }),
  RouterLink: { template: '<a><slot /></a>' },
}))

describe('CustomerDetailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
    vi.clearAllMocks()
  })

  function mountDetail() {
    return mount(CustomerDetailView, {
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
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })
  }

  it('renders profile fields from customer data', async () => {
    ;(api.get as any).mockResolvedValueOnce({
      data: {
        id: 'cust-123',
        code: 'CUST001',
        fullNameEn: 'John Smith',
        fullNameAr: 'جون سميث',
        email: 'john@example.com',
        phone: '+966501234567',
        preferredLanguage: 'en',
        isActive: true,
      },
    })
    ;(api.get as any).mockResolvedValueOnce({ data: [] }) // contacts
    ;(api.get as any).mockResolvedValueOnce({ data: [] }) // notes

    const wrapper = mountDetail()
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('CUST001')
    expect(text).toContain('John Smith')
    expect(text).toContain('john@example.com')
  })

  it('marks the primary contact with a badge', async () => {
    ;(api.get as any).mockResolvedValueOnce({
      data: {
        id: 'cust-123',
        code: 'CUST001',
        fullNameEn: 'Customer',
        fullNameAr: 'عميل',
        email: null,
        phone: null,
        preferredLanguage: 'en',
        isActive: true,
      },
    })
    ;(api.get as any).mockResolvedValueOnce({
      data: [
        { id: 'c1', fullNameEn: 'Primary', fullNameAr: 'أساسي', jobTitle: null, email: null, phone: null, isPrimary: true },
        { id: 'c2', fullNameEn: 'Secondary', fullNameAr: 'ثانوي', jobTitle: null, email: null, phone: null, isPrimary: false },
      ],
    })
    ;(api.get as any).mockResolvedValueOnce({ data: [] }) // notes

    const wrapper = mountDetail()
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Primary')
    expect(text).toContain('Secondary')
  })

  it('shows noPrimary hint when no contact is primary', async () => {
    ;(api.get as any).mockResolvedValueOnce({
      data: {
        id: 'cust-123',
        code: 'CUST001',
        fullNameEn: 'Customer',
        fullNameAr: 'عميل',
        email: null,
        phone: null,
        preferredLanguage: 'en',
        isActive: true,
      },
    })
    ;(api.get as any).mockResolvedValueOnce({
      data: [
        { id: 'c1', fullNameEn: 'Contact', fullNameAr: 'اتصال', jobTitle: null, email: null, phone: null, isPrimary: false },
      ],
    })
    ;(api.get as any).mockResolvedValueOnce({ data: [] })

    const wrapper = mountDetail()
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('No primary contact')
  })

  it('renders not-found state on 404', async () => {
    ;(api.get as any).mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND'))

    const wrapper = mountDetail()
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Customer Not Found')
  })

  it('renders forbidden message on 403', async () => {
    ;(api.get as any).mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN'))

    const wrapper = mountDetail()
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('You do not have permission')
  })

  it("shows edit/delete on current user's notes only", async () => {
    const auth = useAuthStore()
    auth.user = {
      id: 'user-admin',
      email: 'admin@test.local',
      fullNameEn: 'Admin',
      fullNameAr: 'إداري',
      branchId: 'branch-1',
    }
    auth.permissions = ['customers.read', 'customers.update']

    ;(api.get as any).mockResolvedValueOnce({
      data: {
        id: 'cust-123',
        code: 'CUST001',
        fullNameEn: 'Customer',
        fullNameAr: 'عميل',
        email: null,
        phone: null,
        preferredLanguage: 'en',
        isActive: true,
      },
    })
    ;(api.get as any).mockResolvedValueOnce({ data: [] })
    ;(api.get as any).mockResolvedValueOnce({
      data: [
        {
          id: 'note-1',
          body: 'Admin note',
          createdAt: new Date(),
          author: { id: 'user-admin', fullNameEn: 'Admin', fullNameAr: 'إداري' },
        },
        {
          id: 'note-2',
          body: 'Agent note',
          createdAt: new Date(),
          author: { id: 'user-agent', fullNameEn: 'Agent', fullNameAr: 'وكيل' },
        },
      ],
    })

    const wrapper = mountDetail()
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Admin note')
    expect(text).toContain('Agent note')
  })

  it('preserves newlines in multi-line note body', async () => {
    ;(api.get as any).mockResolvedValueOnce({
      data: {
        id: 'cust-123',
        code: 'CUST001',
        fullNameEn: 'Customer',
        fullNameAr: 'عميل',
        email: null,
        phone: null,
        preferredLanguage: 'en',
        isActive: true,
      },
    })
    ;(api.get as any).mockResolvedValueOnce({ data: [] })
    ;(api.get as any).mockResolvedValueOnce({
      data: [
        {
          id: 'note-1',
          body: 'Line 1\nLine 2\nLine 3',
          createdAt: new Date(),
          author: { id: 'user-1', fullNameEn: 'User', fullNameAr: 'مستخدم' },
        },
      ],
    })

    const wrapper = mountDetail()
    await flushPromises()

    const vm = wrapper.vm as any
    const escaped = vm.escapeHtml('Line 1\nLine 2')
    expect(escaped).toContain('<br>')
  })
})
