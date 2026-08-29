import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import UsersView from '../UsersView.vue'
import { i18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'

vi.mock('@/api/client')

function mountView() {
  return mount(UsersView, {
    global: {
      plugins: [i18n],
      stubs: {
        BaseCard: { template: '<div><slot name="header" /><slot /></div>' },
        BaseButton: { template: '<button v-bind="$attrs"><slot /></button>' },
        BaseBadge: true,
        BaseSpinner: true,
        EmptyState: true,
        BaseDialog: { props: ['isOpen'], template: '<div v-if="isOpen"><slot /><slot name="footer" /></div>' },
      },
    },
  })
}

function setPermissions(permissions: string[]) {
  const auth = useAuthStore()
  auth.user = {
    id: 'admin-1', email: 'admin@test.local', fullNameEn: 'Admin', fullNameAr: 'إداري',
    branchId: 'b1', departmentId: 'd1', roleId: 'r1',
    role: { id: 'r1', code: 'ADMIN', nameEn: 'Administrator', nameAr: 'مسؤول' },
  } as any
  auth.permissions = permissions
}

const customerUser = {
  id: 'u1', email: 'customer@test.local', fullNameEn: 'Cust', fullNameAr: 'عميل',
  isActive: true, branchId: 'b1', departmentId: 'd1', roleId: 'r2', customerId: null,
  role: { id: 'r2', code: 'CUSTOMER', nameEn: 'Customer', nameAr: 'عميل' },
}

const agentUser = {
  id: 'u2', email: 'agent@test.local', fullNameEn: 'Agent', fullNameAr: 'وكيل',
  isActive: true, branchId: 'b1', departmentId: 'd1', roleId: 'r3', customerId: null,
  role: { id: 'r3', code: 'AGENT', nameEn: 'Agent', nameAr: 'وكيل' },
}

describe('UsersView customer linking', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
    vi.clearAllMocks()
    vi.useFakeTimers()
    ;(api.get as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/users') return Promise.resolve({ data: [customerUser, agentUser] })
      if (endpoint === '/users/roles') return Promise.resolve({ data: [] })
      if (endpoint.startsWith('/customers?')) return Promise.resolve({ data: { items: [], total: 0, page: 1, pageSize: 10 } })
      return Promise.resolve({ data: [] })
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the link action only on CUSTOMER rows and only with admin.manage', async () => {
    setPermissions(['users.deactivate', 'admin.manage'])
    const wrapper = mountView()
    await flushPromises()

    const linkButtons = wrapper.findAll('button').filter(b => b.text() === 'Link customer')
    expect(linkButtons).toHaveLength(1)
  })

  it('hides the link action entirely without admin.manage', async () => {
    setPermissions(['users.deactivate'])
    const wrapper = mountView()
    await flushPromises()

    const linkButtons = wrapper.findAll('button').filter(b => b.text() === 'Link customer')
    expect(linkButtons).toHaveLength(0)
  })

  it('debounces the customer search to one request', async () => {
    setPermissions(['admin.manage'])
    const wrapper = mountView()
    await flushPromises()

    ;(api.get as any).mockClear()

    const linkButton = wrapper.findAll('button').find(b => b.text() === 'Link customer')
    await linkButton!.trigger('click')

    const search = wrapper.find('input[type="search"]')
    await search.setValue('a')
    await search.setValue('ab')
    await search.setValue('abc')

    expect(api.get).not.toHaveBeenCalled()

    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(api.get).toHaveBeenCalledTimes(1)
    expect((api.get as any).mock.calls[0][0]).toContain('/customers?q=abc')
  })

  it('renders alreadyLinked for a 409', async () => {
    setPermissions(['admin.manage'])
    ;(api.patch as any).mockRejectedValueOnce(new ApiError(409, 'CONFLICT'))
    const wrapper = mountView()
    await flushPromises()

    const linkButton = wrapper.findAll('button').find(b => b.text() === 'Link customer')
    await linkButton!.trigger('click')

    const vm = wrapper.vm as any
    await vm.submitLink({ id: 'c1', fullNameEn: 'John', fullNameAr: 'جون' })
    await flushPromises()

    expect(wrapper.text()).toContain('already linked to another account')
  })

  it('renders notCustomerRole for a 422 with details.userId', async () => {
    setPermissions(['admin.manage'])
    ;(api.patch as any).mockRejectedValueOnce(new ApiError(422, 'VALIDATION_ERROR', { userId: 'x' }))
    const wrapper = mountView()
    await flushPromises()

    const linkButton = wrapper.findAll('button').find(b => b.text() === 'Link customer')
    await linkButton!.trigger('click')

    const vm = wrapper.vm as any
    await vm.submitLink({ id: 'c1', fullNameEn: 'John', fullNameAr: 'جون' })
    await flushPromises()

    expect(wrapper.text()).toContain('Only a customer-role user can be linked')
  })

  it('renders inactiveCustomer for a 422 with details.customerId', async () => {
    setPermissions(['admin.manage'])
    ;(api.patch as any).mockRejectedValueOnce(new ApiError(422, 'VALIDATION_ERROR', { customerId: 'x' }))
    const wrapper = mountView()
    await flushPromises()

    const linkButton = wrapper.findAll('button').find(b => b.text() === 'Link customer')
    await linkButton!.trigger('click')

    const vm = wrapper.vm as any
    await vm.submitLink({ id: 'c1', fullNameEn: 'John', fullNameAr: 'جون' })
    await flushPromises()

    expect(wrapper.text()).toContain('does not exist or is not active')
  })

  it('unlink sends an explicit customerId: null, never an empty body', async () => {
    setPermissions(['admin.manage'])
    ;(api.get as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/users') return Promise.resolve({ data: [{ ...customerUser, customerId: 'cust-1' }, agentUser] })
      if (endpoint.startsWith('/customers/')) return Promise.resolve({ data: { id: 'cust-1', fullNameEn: 'Linked Customer', fullNameAr: 'عميل مرتبط' } })
      return Promise.resolve({ data: [] })
    })
    ;(api.patch as any).mockResolvedValueOnce({ data: {} })

    const wrapper = mountView()
    await flushPromises()

    const linkButton = wrapper.findAll('button').find(b => b.text() === 'Link customer')
    await linkButton!.trigger('click')
    await flushPromises()

    const unlinkButton = wrapper.findAll('button').find(b => b.text() === 'Unlink')
    await unlinkButton!.trigger('click')
    await flushPromises()

    expect(api.patch).toHaveBeenCalledWith('/users/u1/customer', { customerId: null })
  })
})
