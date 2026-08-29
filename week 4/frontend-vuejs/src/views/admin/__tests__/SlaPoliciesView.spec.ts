import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SlaPoliciesView from '../SlaPoliciesView.vue'
import { i18n } from '@/i18n'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'

vi.mock('@/api/client')

function mountView() {
  return mount(SlaPoliciesView, {
    global: {
      plugins: [i18n],
      stubs: {
        BaseCard: { template: '<div><slot name="header" /><slot /></div>' },
        BaseButton: { template: '<button v-bind="$attrs"><slot /></button>' },
        BaseBadge: true,
        BaseSpinner: true,
        BaseDialog: { props: ['isOpen'], template: '<div v-if="isOpen"><slot /><slot name="footer" /></div>' },
      },
    },
  })
}

const policies = [
  { id: 'sp1', priorityId: 'p-low', priority: { id: 'p-low', code: 'LOW', nameEn: 'Low', nameAr: 'منخفضة' }, responseTargetMinutes: 480, resolutionTargetMinutes: 2880, isActive: true },
  { id: 'sp2', priorityId: 'p-urgent', priority: { id: 'p-urgent', code: 'URGENT', nameEn: 'Urgent', nameAr: 'عاجل' }, responseTargetMinutes: 15, resolutionTargetMinutes: 120, isActive: true },
]

describe('SlaPoliciesView', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en'
    vi.clearAllMocks()
  })

  it('renders the four (here two) policy rows in the order returned by the API', async () => {
    ;(api.get as any).mockResolvedValueOnce({ data: policies })
    const wrapper = mountView()
    await flushPromises()

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Low')
    expect(rows[1]!.text()).toContain('Urgent')
  })

  it('blocks a resolution target below the response target client-side, on the resolution field', async () => {
    ;(api.get as any).mockResolvedValueOnce({ data: policies })
    const wrapper = mountView()
    await flushPromises()

    const editButtons = wrapper.findAll('button').filter(b => b.text() === 'Edit')
    await editButtons[0]!.trigger('click')

    const inputs = wrapper.findAll('input[type="text"]')
    await inputs[0]!.setValue('100')
    await inputs[1]!.setValue('50')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(api.put).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('resolution target must be at least the response target')
  })

  it('sends minutes, not hours', async () => {
    ;(api.get as any).mockResolvedValueOnce({ data: policies })
    ;(api.put as any).mockResolvedValueOnce({ data: policies[1] })
    const wrapper = mountView()
    await flushPromises()

    const editButtons = wrapper.findAll('button').filter(b => b.text() === 'Edit')
    await editButtons[1]!.trigger('click')

    const inputs = wrapper.findAll('input[type="text"]')
    await inputs[0]!.setValue('15')
    await inputs[1]!.setValue('120')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(api.put).toHaveBeenCalledWith('/sla/policies/p-urgent', {
      responseTargetMinutes: 15,
      resolutionTargetMinutes: 120,
      isActive: true,
    })
  })

  it('maps a server 422 onto the resolution field', async () => {
    ;(api.get as any).mockResolvedValueOnce({ data: policies })
    ;(api.put as any).mockRejectedValueOnce(new ApiError(422, 'VALIDATION_ERROR'))
    const wrapper = mountView()
    await flushPromises()

    const editButtons = wrapper.findAll('button').filter(b => b.text() === 'Edit')
    await editButtons[1]!.trigger('click')

    const inputs = wrapper.findAll('input[type="text"]')
    await inputs[0]!.setValue('15')
    await inputs[1]!.setValue('120')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('resolution target must be at least the response target')
  })
})
