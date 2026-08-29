import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AdminDepartments from '../AdminDepartments.vue'
import { i18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/api/client'

vi.mock('@/api/client')

function mountView() {
  return mount(AdminDepartments, {
    global: {
      plugins: [i18n],
      stubs: {
        BaseButton: { template: '<button v-bind="$attrs"><slot /></button>' },
        BaseBadge: true,
        BaseSpinner: true,
        EmptyState: true,
        BaseDialog: { props: ['isOpen'], template: '<div v-if="isOpen"><slot /><slot name="footer" /></div>' },
      },
    },
  })
}

function setRole(roleCode: string, branchId = 'branch-1') {
  const auth = useAuthStore()
  auth.user = {
    id: 'user1', email: 'user@test.local', fullNameEn: 'User', fullNameAr: 'مستخدم',
    branchId, departmentId: 'd1', roleId: 'r1',
    role: { id: 'r1', code: roleCode, nameEn: roleCode, nameAr: roleCode },
  } as any
  auth.permissions = ['admin.manage']
}

describe('AdminDepartments', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
    vi.clearAllMocks()
    ;(api.get as any).mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/admin/branches')) {
        return Promise.resolve({ data: [{ id: 'branch-1', nameEn: 'HQ' }, { id: 'branch-2', nameEn: 'Riyadh' }] })
      }
      return Promise.resolve({ data: [] })
    })
  })

  it("locks and pre-selects a MANAGER's branch filter to their own branch", async () => {
    setRole('MANAGER', 'branch-1')
    const wrapper = mountView()
    await flushPromises()

    const select = wrapper.find('select')
    expect((select.element as HTMLSelectElement).disabled).toBe(true)
    expect((select.element as HTMLSelectElement).value).toBe('branch-1')
  })

  it("leaves an ADMIN's branch filter free and defaulted to all", async () => {
    setRole('ADMIN')
    const wrapper = mountView()
    await flushPromises()

    const select = wrapper.find('select')
    expect((select.element as HTMLSelectElement).disabled).toBe(false)
    expect((select.element as HTMLSelectElement).value).toBe('')
  })
})
