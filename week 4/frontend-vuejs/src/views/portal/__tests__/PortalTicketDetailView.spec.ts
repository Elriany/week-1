import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PortalTicketDetailView from '../PortalTicketDetailView.vue'
import { i18n } from '@/i18n'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'

vi.mock('@/api/client')

const params = { id: 'ticket-1' }

vi.mock('vue-router', () => ({
  useRoute: () => ({ params }),
  RouterLink: { template: '<a><slot /></a>' },
}))

function mountView() {
  return mount(PortalTicketDetailView, {
    global: {
      plugins: [i18n],
      stubs: {
        BaseCard: { template: '<div><slot name="header" /><slot /></div>' },
        BaseButton: { template: '<button v-bind="$attrs"><slot /></button>' },
        BaseBadge: true,
        BaseSpinner: true,
        SlaBadge: true,
      },
    },
  })
}

const ticket = {
  id: 'ticket-1',
  ticketNumber: 'TKT-001',
  subject: 'Cannot log in',
  description: 'Details here',
  status: { code: 'NEW', nameEn: 'New', nameAr: 'جديد' },
  category: { code: 'BUG', nameEn: 'Bug', nameAr: 'خلل' },
  sla: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function mockHappyPath() {
  ;(api.get as any)
    .mockResolvedValueOnce({ data: ticket })
    .mockResolvedValueOnce({ data: [] }) // notes
    .mockResolvedValueOnce({ data: [] }) // attachments
    .mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, pageSize: 20 } }) // history
}

describe('PortalTicketDetailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
    vi.clearAllMocks()
  })

  it('renders no status, assignee, priority, or edit control', async () => {
    mockHappyPath()
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Assigned to')
    expect(wrapper.text()).not.toContain('Priority')
    expect(wrapper.text()).not.toContain('tickets.detail.edit')
    expect(wrapper.find('select').exists()).toBe(false)
  })

  it('has no internal-notes checkbox on the note form', async () => {
    mockHappyPath()
    const wrapper = mountView()
    await flushPromises()

    const addButtons = wrapper.findAll('button').filter(b => b.text() === 'Add Note')
    await addButtons[0]!.trigger('click')
    await flushPromises()

    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Internal')
  })

  it('replying posts to /portal/tickets/:id/notes and refetches notes and history', async () => {
    mockHappyPath()
    ;(api.post as any).mockResolvedValueOnce({ data: { id: 'note-1' } })
    ;(api.get as any)
      .mockResolvedValueOnce({ data: [{ id: 'note-1', ticketId: 'ticket-1', body: 'A reply', isInternal: false, createdAt: new Date(), author: null }] }) // reload notes
      .mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, pageSize: 20 } }) // reload history

    const wrapper = mountView()
    await flushPromises()

    const addButtons = wrapper.findAll('button').filter(b => b.text() === 'Add Note')
    await addButtons[0]!.trigger('click')
    await flushPromises()

    const textarea = wrapper.find('textarea')
    await textarea.setValue('A reply')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/portal/tickets/ticket-1/notes', { body: 'A reply' })
    expect(wrapper.text()).toContain('A reply')
  })

  it('renders a not-found state on 404', async () => {
    ;(api.get as any).mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND'))

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Ticket Not Found')
  })

  it('renders download links and no upload control in the attachment list', async () => {
    ;(api.get as any)
      .mockResolvedValueOnce({ data: ticket })
      .mockResolvedValueOnce({ data: [] }) // notes
      .mockResolvedValueOnce({
        data: [{ id: 'att-1', ticketId: 'ticket-1', originalName: 'log.txt', sizeBytes: 100, createdAt: new Date(), uploader: null }],
      })
      .mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, pageSize: 20 } })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Download')
    expect(wrapper.text()).not.toContain('Upload File')
    expect(wrapper.find('input[type="file"]').exists()).toBe(false)
  })
})
