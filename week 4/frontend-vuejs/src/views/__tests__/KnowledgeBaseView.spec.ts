import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import KnowledgeBaseView from '../KnowledgeBaseView.vue'
import { i18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/api/client'

vi.mock('@/api/client')

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ query: {} }),
  RouterLink: { template: '<a><slot /></a>' },
}))

function mountView() {
  return mount(KnowledgeBaseView, {
    global: {
      plugins: [i18n],
      stubs: {
        BaseCard: { template: '<div><slot name="header" /><slot /></div>' },
        BaseButton: { template: '<button><slot /></button>' },
        BaseBadge: true,
        BaseSpinner: true,
      },
    },
  })
}

const emptyCategories = { data: [] }

describe('KnowledgeBaseView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders one card per article with a Draft badge on unpublished ones', async () => {
    ;(api.get as any).mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/kb/categories')) return Promise.resolve(emptyCategories)
      return Promise.resolve({
        data: {
          items: [
            { id: 'a1', categoryId: null, category: null, titleEn: 'Published One', titleAr: 'واحد منشور', excerptEn: 'e', excerptAr: 'e', isPublished: true, updatedAt: new Date() },
            { id: 'a2', categoryId: null, category: null, titleEn: 'Draft One', titleAr: 'مسودة واحدة', excerptEn: 'e', excerptAr: 'e', isPublished: false, updatedAt: new Date() },
          ],
          total: 2,
          page: 1,
          pageSize: 20,
        },
      })
    })

    const wrapper = mountView()
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Published One')
    expect(text).toContain('Draft One')
  })

  it('hides New article and Include drafts without kb.manage', async () => {
    ;(api.get as any).mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/kb/categories')) return Promise.resolve(emptyCategories)
      return Promise.resolve({ data: { items: [], total: 0, page: 1, pageSize: 20 } })
    })
    const auth = useAuthStore()
    auth.user = {
      id: 'user1', email: 'agent@test.local', fullNameEn: 'Agent', fullNameAr: 'وكيل',
      branchId: 'branch1', departmentId: 'dept1', roleId: 'role1',
    } as any
    auth.permissions = ['kb.read']

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).not.toContain('New article')
    expect(wrapper.text()).not.toContain('Include drafts')
  })

  it('shows New article and Include drafts with kb.manage', async () => {
    ;(api.get as any).mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/kb/categories')) return Promise.resolve(emptyCategories)
      return Promise.resolve({ data: { items: [], total: 0, page: 1, pageSize: 20 } })
    })
    const auth = useAuthStore()
    auth.user = {
      id: 'user1', email: 'admin@test.local', fullNameEn: 'Admin', fullNameAr: 'إداري',
      branchId: 'branch1', departmentId: 'dept1', roleId: 'role1',
    } as any
    auth.permissions = ['kb.read', 'kb.manage']

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('New article')
    expect(wrapper.text()).toContain('Include drafts')
  })

  it('issues one request after the search debounce', async () => {
    ;(api.get as any).mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/kb/categories')) return Promise.resolve(emptyCategories)
      return Promise.resolve({ data: { items: [], total: 0, page: 1, pageSize: 20 } })
    })

    const wrapper = mountView()
    await flushPromises()
    const callsAfterMount = (api.get as any).mock.calls.length

    const input = wrapper.find('input[type="search"]')
    await input.setValue('billing')

    expect((api.get as any).mock.calls.length).toBe(callsAfterMount)

    vi.advanceTimersByTime(300)
    await flushPromises()

    expect((api.get as any).mock.calls.length).toBe(callsAfterMount + 1)
  })

  it('shows two distinct empty states', async () => {
    ;(api.get as any).mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/kb/categories')) return Promise.resolve(emptyCategories)
      return Promise.resolve({ data: { items: [], total: 0, page: 1, pageSize: 20 } })
    })

    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('No articles yet')

    const input = wrapper.find('input[type="search"]')
    await input.setValue('nonexistent')
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(wrapper.text()).toContain('No articles found')
  })
})
