import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TicketHistoryTimeline from '../TicketHistoryTimeline.vue'
import { i18n } from '@/i18n'

function mountTimeline(props: Record<string, unknown> = {}) {
  return mount(TicketHistoryTimeline, {
    props: {
      entries: [],
      loading: false,
      error: '',
      hasMore: false,
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

describe('TicketHistoryTimeline', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en'
  })

  it('renders every entry kind', () => {
    const wrapper = mountTimeline({
      entries: [
        { id: 'e1', kind: 'audit', createdAt: new Date(), actor: { id: 'u1', fullNameEn: 'John', fullNameAr: 'جون' }, action: 'Status changed', fromValue: 'NEW', toValue: 'ASSIGNED' },
        { id: 'e2', kind: 'note', createdAt: new Date(), actor: { id: 'u1', fullNameEn: 'John', fullNameAr: 'جون' }, body: 'A note' },
        { id: 'e3', kind: 'attachment', createdAt: new Date(), actor: { id: 'u1', fullNameEn: 'John', fullNameAr: 'جون' }, fileName: 'file.pdf' },
      ],
    })

    const text = wrapper.text()
    expect(text).toContain('Status changed')
    expect(text).toContain('A note')
    expect(text).toContain('file.pdf')
  })

  it('shows the load more button only when hasMore is true', () => {
    const entry = { id: 'e1', kind: 'audit' as const, createdAt: new Date() }
    expect(mountTimeline({ entries: [entry], hasMore: false }).text()).not.toContain('Load More')
    expect(mountTimeline({ entries: [entry], hasMore: true }).text()).toContain('Load More')
  })

  it('emits loadMore when the button is clicked', async () => {
    const entry = { id: 'e1', kind: 'audit' as const, createdAt: new Date() }
    const wrapper = mountTimeline({ entries: [entry], hasMore: true })
    const button = wrapper.findAll('button').find(b => b.text() === 'Load More')
    await button!.trigger('click')
    expect(wrapper.emitted('loadMore')).toBeTruthy()
  })
})
