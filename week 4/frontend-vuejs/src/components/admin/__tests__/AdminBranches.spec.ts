import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AdminBranches from '../AdminBranches.vue'
import { i18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'

vi.mock('@/api/client')

function mountView() {
  return mount(AdminBranches, {
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

const branches = [
  { id: 'b1', code: 'HQ', nameEn: 'Headquarters', nameAr: 'المقر الرئيسي', isActive: true },
]

function setRole(roleCode: string) {
  const auth = useAuthStore()
  auth.user = {
    id: 'user1', email: 'user@test.local', fullNameEn: 'User', fullNameAr: 'مستخدم',
    branchId: 'b1', departmentId: 'd1', roleId: 'r1',
    role: { id: 'r1', code: roleCode, nameEn: roleCode, nameAr: roleCode },
  } as any
  auth.permissions = ['admin.manage']
}

describe('AdminBranches', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
    vi.clearAllMocks()
  })

  it('shows create and edit for an ADMIN', async () => {
    setRole('ADMIN')
    ;(api.get as any).mockResolvedValueOnce({ data: branches })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('New')
    expect(wrapper.text()).toContain('Edit')
    expect(wrapper.text()).not.toContain('Only an Administrator')
  })

  it('hides create and edit for a MANAGER, and shows the note', async () => {
    setRole('MANAGER')
    ;(api.get as any).mockResolvedValueOnce({ data: branches })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).not.toContain('New')
    expect(wrapper.text()).not.toContain('Edit')
    expect(wrapper.text()).toContain('Only an Administrator')
  })

  it('shows code as read-only text in the edit dialog', async () => {
    setRole('ADMIN')
    ;(api.get as any).mockResolvedValueOnce({ data: branches })

    const wrapper = mountView()
    await flushPromises()

    const editButton = wrapper.findAll('button').find(b => b.text() === 'Edit')
    await editButton!.trigger('click')

    expect(wrapper.text()).toContain('HQ')
    // The code input from create mode must not be present in edit mode.
    const codeInputs = wrapper.findAll('input').filter(i => (i.element as HTMLInputElement).value === 'HQ')
    expect(codeInputs).toHaveLength(0)
  })

  it('renders admin.errors.branchInUse on a 409 deactivate, not the generic banner', async () => {
    setRole('ADMIN')
    ;(api.get as any).mockResolvedValueOnce({ data: branches })
    ;(api.patch as any).mockRejectedValueOnce(new ApiError(409, 'CONFLICT', undefined, undefined, 'Cannot deactivate: 2 active user(s) still belong to this branch'))

    const wrapper = mountView()
    await flushPromises()

    const deactivateButton = wrapper.findAll('button').find(b => b.text() === 'Deactivate')
    await deactivateButton!.trigger('click')
    await flushPromises()

    const confirmButtons = wrapper.findAll('button').filter(b => b.text() === 'Deactivate')
    await confirmButtons[confirmButtons.length - 1]!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('cannot be deactivated while it still has active users or open tickets')
    expect(wrapper.text()).not.toContain('Cannot reach the server')
  })

  it('renders admin.errors.duplicateCode on the code field for a 409 on create', async () => {
    setRole('ADMIN')
    ;(api.get as any).mockResolvedValueOnce({ data: branches })
    ;(api.post as any).mockRejectedValueOnce(new ApiError(409, 'CONFLICT', undefined, undefined, 'A branch with this code already exists'))

    const wrapper = mountView()
    await flushPromises()

    const newButton = wrapper.findAll('button').find(b => b.text() === 'New')
    await newButton!.trigger('click')

    const codeInput = wrapper.findAll('input')[0]
    await codeInput!.setValue('HQ')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('This code is already in use')
  })
})
