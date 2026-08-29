import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TicketNotesList from '../TicketNotesList.vue'
import { i18n } from '@/i18n'

function mountList(props: Partial<InstanceType<typeof TicketNotesList>['$props']> = {}) {
  return mount(TicketNotesList, {
    props: {
      notes: [],
      loading: false,
      error: '',
      canAddNote: true,
      canEdit: () => false,
      creating: false,
      form: { body: '', isInternal: true },
      formError: '',
      saving: false,
      ...props,
    },
    global: {
      plugins: [i18n],
      stubs: {
        BaseCard: { template: '<div><slot name="header" /><slot /></div>' },
        BaseButton: { template: '<button v-bind="$attrs"><slot /></button>' },
        BaseBadge: true,
        BaseSpinner: true,
        EmptyState: true,
      },
    },
  })
}

describe('TicketNotesList', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en'
  })

  it('shows the internal-note checkbox by default while creating', async () => {
    const wrapper = mountList({ creating: true })
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true)
  })

  it('removes the internal-note checkbox from the DOM when allowInternalToggle is false', async () => {
    const wrapper = mountList({ creating: true, allowInternalToggle: false })
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
  })

  it('renders a note body escaped, never as raw HTML', () => {
    const wrapper = mountList({
      notes: [
        {
          id: 'n1',
          ticketId: 't1',
          body: '<script>alert(1)</script>',
          isInternal: false,
          createdAt: new Date(),
          author: null,
        },
      ],
    })

    expect(wrapper.text()).toContain('<script>alert(1)</script>')
    expect(wrapper.find('script').exists()).toBe(false)
  })

  it('hides the Add Note button when canAddNote is false', () => {
    const wrapper = mountList({ canAddNote: false })
    expect(wrapper.text()).not.toContain('Add Note')
  })

  it('shows edit and delete actions only when canEdit returns true', () => {
    const note = { id: 'n1', ticketId: 't1', body: 'hi', isInternal: false, createdAt: new Date(), author: null }
    const hidden = mountList({ notes: [note], canEdit: () => false })
    expect(hidden.text()).not.toContain('Delete')

    const shown = mountList({ notes: [note], canEdit: () => true })
    expect(shown.text()).toContain('Delete')
  })
})
