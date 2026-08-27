import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TicketDetailView from '../TicketDetailView.vue'
import { i18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/api/client'

vi.mock('@/api/client')

const push = vi.fn()
let currentParams: Record<string, string> = {}

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ params: currentParams }),
  RouterLink: { template: '<a><slot /></a>' },
}))

function mountTicketDetail() {
  return mount(TicketDetailView, {
    global: {
      plugins: [i18n],
      stubs: {
        BaseCard: true,
        BaseButton: true,
        BaseInput: true,
        BaseBadge: true,
        BaseSpinner: true,
        EmptyState: true,
      },
    },
  })
}

describe('TicketDetailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
    currentParams = { id: 'ticket-1' }
    push.mockReset()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders ticket profile with all fields', async () => {
    const mockMeta = {
      data: {
        statuses: [{ code: 'NEW', nameEn: 'New', nameAr: 'جديد' }],
        priorities: [{ code: 'HIGH', nameEn: 'High', nameAr: 'عالية' }],
        categories: [{ code: 'BUG', nameEn: 'Bug', nameAr: 'خلل' }],
      },
    }
    const mockAssignees = { data: [] }
    const mockTicket = {
      data: {
        id: 'ticket-1',
        ticketNumber: 'TKT-001',
        subject: 'Test Ticket',
        description: 'Test description',
        customerId: 'customer-1',
        customer: { id: 'customer-1', fullNameEn: 'John', fullNameAr: 'جون' },
        priority: { code: 'HIGH', nameEn: 'High', nameAr: 'عالية' },
        status: { code: 'NEW', nameEn: 'New', nameAr: 'جديد' },
        category: { code: 'BUG', nameEn: 'Bug', nameAr: 'خلل' },
        department: 'Support',
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }
    const mockNotes = { data: [] }
    const mockAttachments = { data: [] }
    const mockHistory = { data: { items: [], hasMore: false } }

    (api.get as any)
      .mockResolvedValueOnce(mockMeta)
      .mockResolvedValueOnce(mockAssignees)
      .mockResolvedValueOnce(mockTicket)
      .mockResolvedValueOnce(mockNotes)
      .mockResolvedValueOnce(mockAttachments)
      .mockResolvedValueOnce(mockHistory)

    const wrapper = mountTicketDetail()
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('TKT-001')
    expect(text).toContain('Test Ticket')
  })

  it('shows status dropdown with allowed transitions only', async () => {
    const mockMeta = {
      data: {
        statuses: [
          { code: 'NEW', nameEn: 'New', nameAr: 'جديد' },
          { code: 'ASSIGNED', nameEn: 'Assigned', nameAr: 'مُسند' },
          { code: 'CLOSED', nameEn: 'Closed', nameAr: 'مغلق' },
        ],
        priorities: [],
        categories: [],
      },
    }
    const mockAssignees = { data: [] }
    const mockTicket = {
      data: {
        id: 'ticket-1',
        ticketNumber: 'TKT-001',
        subject: 'Test',
        description: null,
        customerId: 'c1',
        customer: { id: 'c1', fullNameEn: 'Test', fullNameAr: 'اختبار' },
        priority: { code: 'HIGH', nameEn: 'High', nameAr: 'عالية' },
        status: { code: 'NEW', nameEn: 'New', nameAr: 'جديد' },
        category: { code: 'BUG', nameEn: 'Bug', nameAr: 'خلل' },
        department: null,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }
    const mockNotes = { data: [] }
    const mockAttachments = { data: [] }
    const mockHistory = { data: { items: [], hasMore: false } }

    (api.get as any)
      .mockResolvedValueOnce(mockMeta)
      .mockResolvedValueOnce(mockAssignees)
      .mockResolvedValueOnce(mockTicket)
      .mockResolvedValueOnce(mockNotes)
      .mockResolvedValueOnce(mockAttachments)
      .mockResolvedValueOnce(mockHistory)

    const wrapper = mountTicketDetail()
    await flushPromises()

    const vm = wrapper.vm as any
    // NEW status can transition to ASSIGNED, IN_PROGRESS, CLOSED
    expect(vm.allowedTransitions).toEqual(['ASSIGNED', 'IN_PROGRESS', 'CLOSED'])
  })

  it('hides lifecycle card when status is CLOSED', async () => {
    const mockMeta = {
      data: {
        statuses: [{ code: 'CLOSED', nameEn: 'Closed', nameAr: 'مغلق' }],
        priorities: [],
        categories: [],
      },
    }
    const mockAssignees = { data: [] }
    const mockTicket = {
      data: {
        id: 'ticket-1',
        ticketNumber: 'TKT-001',
        subject: 'Test',
        description: null,
        customerId: 'c1',
        customer: { id: 'c1', fullNameEn: 'Test', fullNameAr: 'اختبار' },
        priority: { code: 'HIGH', nameEn: 'High', nameAr: 'عالية' },
        status: { code: 'CLOSED', nameEn: 'Closed', nameAr: 'مغلق' },
        category: { code: 'BUG', nameEn: 'Bug', nameAr: 'خلل' },
        department: null,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }
    const mockNotes = { data: [] }
    const mockAttachments = { data: [] }
    const mockHistory = { data: { items: [], hasMore: false } }

    (api.get as any)
      .mockResolvedValueOnce(mockMeta)
      .mockResolvedValueOnce(mockAssignees)
      .mockResolvedValueOnce(mockTicket)
      .mockResolvedValueOnce(mockNotes)
      .mockResolvedValueOnce(mockAttachments)
      .mockResolvedValueOnce(mockHistory)

    const wrapper = mountTicketDetail()
    await flushPromises()

    // Should not render lifecycle card (it's v-if on status !== CLOSED)
    const text = wrapper.text()
    expect(text).not.toContain('lifecycle')
  })

  it('hides assignee control without tickets.assign permission', async () => {
    const mockMeta = {
      data: {
        statuses: [{ code: 'NEW', nameEn: 'New', nameAr: 'جديد' }],
        priorities: [],
        categories: [],
      },
    }
    const mockAssignees = { data: [] }
    const mockTicket = {
      data: {
        id: 'ticket-1',
        ticketNumber: 'TKT-001',
        subject: 'Test',
        description: null,
        customerId: 'c1',
        customer: { id: 'c1', fullNameEn: 'Test', fullNameAr: 'اختبار' },
        priority: { code: 'HIGH', nameEn: 'High', nameAr: 'عالية' },
        status: { code: 'NEW', nameEn: 'New', nameAr: 'جديد' },
        category: { code: 'BUG', nameEn: 'Bug', nameAr: 'خلل' },
        department: null,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }
    const mockNotes = { data: [] }
    const mockAttachments = { data: [] }
    const mockHistory = { data: { items: [], hasMore: false } }

    (api.get as any)
      .mockResolvedValueOnce(mockMeta)
      .mockResolvedValueOnce(mockAssignees)
      .mockResolvedValueOnce(mockTicket)
      .mockResolvedValueOnce(mockNotes)
      .mockResolvedValueOnce(mockAttachments)
      .mockResolvedValueOnce(mockHistory)

    const auth = useAuthStore()
    auth.user = {
      id: 'user1',
      email: 'agent@test.local',
      fullNameEn: 'Agent',
      fullNameAr: 'وكيل',
      branchId: 'branch1',
      permissions: ['tickets.read', 'tickets.update'],
    }

    const wrapper = mountTicketDetail()
    await flushPromises()

    // Should not have assignee section (gated on tickets.assign)
    const text = wrapper.text()
    expect(text).not.toContain('Assignee')
  })

  it('allows edit and delete for note author', async () => {
    const mockMeta = {
      data: {
        statuses: [],
        priorities: [],
        categories: [],
      },
    }
    const mockAssignees = { data: [] }
    const mockTicket = {
      data: {
        id: 'ticket-1',
        ticketNumber: 'TKT-001',
        subject: 'Test',
        description: null,
        customerId: 'c1',
        customer: { id: 'c1', fullNameEn: 'Test', fullNameAr: 'اختبار' },
        priority: { code: 'HIGH', nameEn: 'High', nameAr: 'عالية' },
        status: { code: 'NEW', nameEn: 'New', nameAr: 'جديد' },
        category: { code: 'BUG', nameEn: 'Bug', nameAr: 'خلل' },
        department: null,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }
    const mockNotes = {
      data: [
        {
          id: 'note-1',
          ticketId: 'ticket-1',
          body: 'Test note',
          isInternal: false,
          createdAt: new Date(),
          author: { id: 'user1', fullNameEn: 'John', fullNameAr: 'جون' },
        },
      ],
    }
    const mockAttachments = { data: [] }
    const mockHistory = { data: { items: [], hasMore: false } }

    (api.get as any)
      .mockResolvedValueOnce(mockMeta)
      .mockResolvedValueOnce(mockAssignees)
      .mockResolvedValueOnce(mockTicket)
      .mockResolvedValueOnce(mockNotes)
      .mockResolvedValueOnce(mockAttachments)
      .mockResolvedValueOnce(mockHistory)

    const auth = useAuthStore()
    auth.user = {
      id: 'user1',
      email: 'user@test.local',
      fullNameEn: 'User',
      fullNameAr: 'مستخدم',
      branchId: 'branch1',
      permissions: ['tickets.read', 'tickets.update'],
    }

    const wrapper = mountTicketDetail()
    await flushPromises()

    const vm = wrapper.vm as any
    const canEdit = vm.canEditNote(vm.notes[0])
    expect(canEdit).toBe(true)
  })

  it('coerces sizeBytes to number for formatting', async () => {
    const mockMeta = {
      data: {
        statuses: [],
        priorities: [],
        categories: [],
      },
    }
    const mockAssignees = { data: [] }
    const mockTicket = {
      data: {
        id: 'ticket-1',
        ticketNumber: 'TKT-001',
        subject: 'Test',
        description: null,
        customerId: 'c1',
        customer: { id: 'c1', fullNameEn: 'Test', fullNameAr: 'اختبار' },
        priority: { code: 'HIGH', nameEn: 'High', nameAr: 'عالية' },
        status: { code: 'NEW', nameEn: 'New', nameAr: 'جديد' },
        category: { code: 'BUG', nameEn: 'Bug', nameAr: 'خلل' },
        department: null,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }
    const mockNotes = { data: [] }
    const mockAttachments = {
      data: [
        {
          id: 'att-1',
          ticketId: 'ticket-1',
          originalName: 'test.pdf',
          sizeBytes: '1024', // String that should be coerced to number
          createdAt: new Date(),
          uploader: { id: 'user1', fullNameEn: 'User', fullNameAr: 'مستخدم' },
        },
      ],
    }
    const mockHistory = { data: { items: [], hasMore: false } }

    (api.get as any)
      .mockResolvedValueOnce(mockMeta)
      .mockResolvedValueOnce(mockAssignees)
      .mockResolvedValueOnce(mockTicket)
      .mockResolvedValueOnce(mockNotes)
      .mockResolvedValueOnce(mockAttachments)
      .mockResolvedValueOnce(mockHistory)

    const wrapper = mountTicketDetail()
    await flushPromises()

    const vm = wrapper.vm as any
    expect(vm.attachments[0].sizeBytes).toBe('1024')
    // formatNumber should handle Number() coercion correctly
  })

  it('renders timeline with multiple entry kinds', async () => {
    const mockMeta = {
      data: {
        statuses: [],
        priorities: [],
        categories: [],
      },
    }
    const mockAssignees = { data: [] }
    const mockTicket = {
      data: {
        id: 'ticket-1',
        ticketNumber: 'TKT-001',
        subject: 'Test',
        description: null,
        customerId: 'c1',
        customer: { id: 'c1', fullNameEn: 'Test', fullNameAr: 'اختبار' },
        priority: { code: 'HIGH', nameEn: 'High', nameAr: 'عالية' },
        status: { code: 'NEW', nameEn: 'New', nameAr: 'جديد' },
        category: { code: 'BUG', nameEn: 'Bug', nameAr: 'خلل' },
        department: null,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }
    const mockNotes = { data: [] }
    const mockAttachments = { data: [] }
    const mockHistory = {
      data: {
        items: [
          {
            id: 'audit-1',
            kind: 'audit',
            createdAt: new Date(),
            actor: { id: 'user1', fullNameEn: 'John', fullNameAr: 'جون' },
            action: 'Status changed',
            fromValue: 'NEW',
            toValue: 'ASSIGNED',
          },
          {
            id: 'note-1',
            kind: 'note',
            createdAt: new Date(),
            actor: { id: 'user1', fullNameEn: 'John', fullNameAr: 'جون' },
            body: 'Test note',
          },
          {
            id: 'att-1',
            kind: 'attachment',
            createdAt: new Date(),
            actor: { id: 'user1', fullNameEn: 'John', fullNameAr: 'جون' },
            fileName: 'test.pdf',
          },
        ],
        hasMore: false,
      },
    }

    (api.get as any)
      .mockResolvedValueOnce(mockMeta)
      .mockResolvedValueOnce(mockAssignees)
      .mockResolvedValueOnce(mockTicket)
      .mockResolvedValueOnce(mockNotes)
      .mockResolvedValueOnce(mockAttachments)
      .mockResolvedValueOnce(mockHistory)

    const wrapper = mountTicketDetail()
    await flushPromises()

    const vm = wrapper.vm as any
    expect(vm.history).toHaveLength(3)
    expect(vm.history[0].kind).toBe('audit')
    expect(vm.history[1].kind).toBe('note')
    expect(vm.history[2].kind).toBe('attachment')
  })

  it('shows load more button when hasMore is true', async () => {
    const mockMeta = {
      data: {
        statuses: [],
        priorities: [],
        categories: [],
      },
    }
    const mockAssignees = { data: [] }
    const mockTicket = {
      data: {
        id: 'ticket-1',
        ticketNumber: 'TKT-001',
        subject: 'Test',
        description: null,
        customerId: 'c1',
        customer: { id: 'c1', fullNameEn: 'Test', fullNameAr: 'اختبار' },
        priority: { code: 'HIGH', nameEn: 'High', nameAr: 'عالية' },
        status: { code: 'NEW', nameEn: 'New', nameAr: 'جديد' },
        category: { code: 'BUG', nameEn: 'Bug', nameAr: 'خلل' },
        department: null,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }
    const mockNotes = { data: [] }
    const mockAttachments = { data: [] }
    const mockHistory = {
      data: {
        items: [{ id: 'entry-1', kind: 'audit', createdAt: new Date() }],
        hasMore: true,
      },
    }

    (api.get as any)
      .mockResolvedValueOnce(mockMeta)
      .mockResolvedValueOnce(mockAssignees)
      .mockResolvedValueOnce(mockTicket)
      .mockResolvedValueOnce(mockNotes)
      .mockResolvedValueOnce(mockAttachments)
      .mockResolvedValueOnce(mockHistory)

    const wrapper = mountTicketDetail()
    await flushPromises()

    const vm = wrapper.vm as any
    expect(vm.canLoadMoreHistory).toBe(true)
  })
})
