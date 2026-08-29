import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AdminPriorities from '../AdminPriorities.vue'
import { i18n } from '@/i18n'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'

vi.mock('@/api/client')

vi.mock('vue-router', () => ({
  RouterLink: { props: ['to'], template: '<a :data-to="JSON.stringify(to)"><slot /></a>' },
}))

function mountView() {
  return mount(AdminPriorities, {
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

const priorities = [{ id: 'p1', code: 'URGENT', nameEn: 'Urgent', nameAr: 'عاجل', sortOrder: 1, isActive: true }]

describe('AdminPriorities', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en'
    vi.clearAllMocks()
    ;(api.get as any).mockResolvedValue({ data: priorities })
  })

  it('renders admin.errors.priorityHasSla with a link to the SLA screen on a 409 deactivate', async () => {
    ;(api.patch as any).mockRejectedValueOnce(new ApiError(409, 'CONFLICT', undefined, undefined, 'Cannot deactivate: an active SLA policy still targets this priority'))

    const wrapper = mountView()
    await flushPromises()

    const deactivateButton = wrapper.findAll('button').find(b => b.text() === 'Deactivate')
    await deactivateButton!.trigger('click')
    await flushPromises()

    const confirmButtons = wrapper.findAll('button').filter(b => b.text() === 'Deactivate')
    await confirmButtons[confirmButtons.length - 1]!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('cannot be deactivated while an active SLA policy')
    const link = wrapper.find('a[data-to]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('data-to')).toContain('admin-sla')
  })
})
