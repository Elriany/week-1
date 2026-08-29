import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AdminStatuses from '../AdminStatuses.vue'
import { i18n } from '@/i18n'
import { api } from '@/api/client'

vi.mock('@/api/client')

function mountView() {
  return mount(AdminStatuses, {
    global: {
      plugins: [i18n],
      stubs: {
        BaseButton: { template: '<button v-bind="$attrs"><slot /></button>' },
        BaseSpinner: true,
        EmptyState: true,
        BaseDialog: { props: ['isOpen'], template: '<div v-if="isOpen"><slot /><slot name="footer" /></div>' },
      },
    },
  })
}

const statuses = [
  { id: 's1', code: 'NEW', nameEn: 'New', nameAr: 'جديد', sortOrder: 1 },
  { id: 's2', code: 'CLOSED', nameEn: 'Closed', nameAr: 'مغلق نهائياً', sortOrder: 6 },
]

describe('AdminStatuses', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en'
    vi.clearAllMocks()
    ;(api.get as any).mockResolvedValue({ data: statuses })
  })

  it('has no create button and no deactivate toggle in the DOM', async () => {
    const wrapper = mountView()
    await flushPromises()

    const buttonTexts = wrapper.findAll('button').map(b => b.text())
    expect(buttonTexts).not.toContain('New')
    expect(buttonTexts).not.toContain('Activate')
    expect(buttonTexts).not.toContain('Deactivate')
  })

  it('renders the explanatory note', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('Ticket statuses are defined by the workflow')
  })

  it('sends only nameEn, nameAr, and sortOrder when editing', async () => {
    ;(api.patch as any).mockResolvedValueOnce({ data: statuses[0] })
    const wrapper = mountView()
    await flushPromises()

    const editButton = wrapper.findAll('button').find(b => b.text() === 'Edit')
    await editButton!.trigger('click')

    const inputs = wrapper.findAll('input')
    await inputs[0]!.setValue('New Renamed')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(api.patch).toHaveBeenCalledTimes(1)
    const [endpoint, body] = (api.patch as any).mock.calls[0]
    expect(endpoint).toBe('/admin/reference/statuses/s1')
    expect(Object.keys(body).sort()).toEqual(['nameAr', 'nameEn', 'sortOrder'])
  })
})
