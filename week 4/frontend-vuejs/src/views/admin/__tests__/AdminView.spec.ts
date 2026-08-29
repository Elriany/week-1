import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AdminView from '../AdminView.vue'
import { i18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/api/client'

vi.mock('@/api/client')

function mountView() {
  return mount(AdminView, {
    global: {
      plugins: [i18n],
      stubs: {
        BaseCard: { template: '<div><slot name="header" /><slot /></div>' },
        BaseButton: { template: '<button v-bind="$attrs"><slot /></button>' },
        BaseBadge: true,
        BaseSpinner: true,
        EmptyState: true,
        BaseDialog: true,
      },
    },
  })
}

describe('AdminView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
    vi.clearAllMocks()
    const auth = useAuthStore()
    auth.user = {
      id: 'user1', email: 'admin@test.local', fullNameEn: 'Admin', fullNameAr: 'إداري',
      branchId: 'b1', departmentId: 'd1', roleId: 'r1',
      role: { id: 'r1', code: 'ADMIN', nameEn: 'Administrator', nameAr: 'مسؤول' },
    } as any
    auth.permissions = ['admin.manage']
    ;(api.get as any).mockResolvedValue({ data: [] })
  })

  it('renders five tabs', async () => {
    const wrapper = mountView()
    await flushPromises()

    const tabs = wrapper.findAll('[role="tab"]').map(t => t.text())
    expect(tabs).toEqual(['Branches', 'Departments', 'Categories', 'Priorities', 'Statuses'])
  })

  it('switching tabs mounts the matching child', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Branches')

    const tabs = wrapper.findAll('[role="tab"]')
    await tabs[4]!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Ticket statuses are defined by the workflow')
  })
})
