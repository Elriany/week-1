import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PortalNewTicketView from '../PortalNewTicketView.vue'
import { i18n } from '@/i18n'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'

vi.mock('@/api/client')

const push = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  RouterLink: { template: '<a><slot /></a>' },
}))

function mountView() {
  return mount(PortalNewTicketView, {
    global: {
      plugins: [i18n],
      stubs: {
        BaseCard: { template: '<div><slot name="header" /><slot /></div>' },
        BaseButton: { template: '<button v-bind="$attrs"><slot /></button>' },
      },
    },
  })
}

const emptyMeta = { data: { categories: [], priorities: [] } }

async function fillAndSubmit(wrapper: ReturnType<typeof mountView>) {
  const inputs = wrapper.findAll('input')
  await inputs[0]!.setValue('Cannot log in')
  const textarea = wrapper.find('textarea')
  await textarea.setValue('I get an error every time I try to sign in.')
  await wrapper.find('form').trigger('submit.prevent')
  await flushPromises()
}

describe('PortalNewTicketView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
    push.mockReset()
    vi.clearAllMocks()
    ;(api.get as any).mockResolvedValue(emptyMeta)
  })

  it('submits exactly subject, description, categoryId, priorityCode', async () => {
    ;(api.post as any).mockResolvedValueOnce({ data: { id: 'ticket-1', ticketNumber: 'TKT-001' } })

    const wrapper = mountView()
    await flushPromises()
    await fillAndSubmit(wrapper)

    expect(api.post).toHaveBeenCalledTimes(1)
    const [endpoint, body] = (api.post as any).mock.calls[0]
    expect(endpoint).toBe('/portal/tickets')
    expect(Object.keys(body).sort()).toEqual(['categoryId', 'description', 'priorityCode', 'subject'])
  })

  it('maps a 422 details.subject to the subject field', async () => {
    ;(api.post as any).mockRejectedValueOnce(
      new ApiError(422, 'VALIDATION_ERROR', { subject: { _errors: ['Subject is required'] } }, undefined, 'Validation failed'),
    )

    const wrapper = mountView()
    await flushPromises()
    await fillAndSubmit(wrapper)

    expect(wrapper.text()).toContain('Subject is required')
  })

  it('renders the configuration-error message on a 409', async () => {
    ;(api.post as any).mockRejectedValueOnce(new ApiError(409, 'CONFLICT'))

    const wrapper = mountView()
    await flushPromises()
    await fillAndSubmit(wrapper)

    expect(wrapper.text()).toContain('not yet configured')
  })

  it('issues exactly one request for two rapid submits', async () => {
    let resolvePost: ((v: any) => void) | null = null
    ;(api.post as any).mockReturnValueOnce(
      new Promise(resolve => {
        resolvePost = resolve
      }),
    )

    const wrapper = mountView()
    await flushPromises()

    const inputs = wrapper.findAll('input')
    await inputs[0]!.setValue('Cannot log in')
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Description text here.')

    const form = wrapper.find('form')
    await form.trigger('submit.prevent')
    await form.trigger('submit.prevent')
    await flushPromises()

    expect(api.post).toHaveBeenCalledTimes(1)
    resolvePost!({ data: { id: 'ticket-1', ticketNumber: 'TKT-001' } })
    await flushPromises()
  })

  it('shows the ticket number and navigates to the detail route on success', async () => {
    ;(api.post as any).mockResolvedValueOnce({ data: { id: 'ticket-1', ticketNumber: 'TKT-001' } })

    const wrapper = mountView()
    await flushPromises()
    await fillAndSubmit(wrapper)

    expect(wrapper.text()).toContain('TKT-001')
  })
})
