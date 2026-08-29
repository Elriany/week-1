import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AttachmentsList from '../AttachmentsList.vue'
import { i18n } from '@/i18n'
import { api } from '@/api/client'

vi.mock('@/api/client')

const attachment = {
  id: 'a1',
  ticketId: 't1',
  originalName: 'file.pdf',
  sizeBytes: 1024,
  createdAt: new Date(),
  uploader: null,
}

function mountList(props: Record<string, unknown> = {}) {
  return mount(AttachmentsList, {
    props: {
      attachments: [attachment],
      loading: false,
      error: '',
      canUpload: false,
      ...props,
    },
    global: {
      plugins: [i18n],
      stubs: {
        BaseCard: { template: '<div><slot name="header" /><slot /></div>' },
        BaseButton: { template: '<button v-bind="$attrs"><slot /></button>' },
        BaseSpinner: true,
        EmptyState: true,
      },
    },
  })
}

describe('AttachmentsList', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en'
    vi.clearAllMocks()
  })

  it('always renders a download link, even without canUpload', () => {
    const wrapper = mountList({ canUpload: false })
    expect(wrapper.text()).toContain('Download')
  })

  it('hides the upload button and delete action without canUpload', () => {
    const wrapper = mountList({ canUpload: false })
    expect(wrapper.text()).not.toContain('Upload File')
    expect(wrapper.text()).not.toContain('Delete')
    expect(wrapper.find('input[type="file"]').exists()).toBe(false)
  })

  it('shows the upload button and delete action with canUpload', () => {
    const wrapper = mountList({ canUpload: true })
    expect(wrapper.text()).toContain('Upload File')
    expect(wrapper.text()).toContain('Delete')
  })

  it('emits download with the row when Download is clicked', async () => {
    const wrapper = mountList()
    const button = wrapper.findAll('button').find(b => b.text() === 'Download')
    await button!.trigger('click')
    expect(wrapper.emitted('download')?.[0]).toEqual([attachment])
  })

  it('uploads the selected file to uploadEndpoint and emits uploaded', async () => {
    ;(api.upload as any).mockResolvedValueOnce({ data: {} })
    const wrapper = mountList({ canUpload: true, uploadEndpoint: '/tickets/t1/attachments' })

    const uploadButton = wrapper.findAll('button').find(b => b.text() === 'Upload File')
    await uploadButton!.trigger('click')

    const fileInput = wrapper.find('input[type="file"]')
    const file = new File(['data'], 'report.pdf', { type: 'application/pdf' })
    Object.defineProperty(fileInput.element, 'files', { value: [file] })
    await fileInput.trigger('change')

    await wrapper.find('form').trigger('submit.prevent')
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(api.upload).toHaveBeenCalledWith('/tickets/t1/attachments', expect.any(FormData))
    expect(wrapper.emitted('uploaded')).toBeTruthy()
  })
})
