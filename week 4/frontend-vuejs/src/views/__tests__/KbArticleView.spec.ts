import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import KbArticleView from '../KbArticleView.vue'
import { i18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'

vi.mock('@/api/client')

const params = { id: 'article-1' }
const push = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ params }),
  RouterLink: { template: '<a><slot /></a>' },
}))

function mountView() {
  return mount(KbArticleView, {
    global: {
      plugins: [i18n],
      stubs: {
        BaseCard: { template: '<div><slot name="header" /><slot /></div>' },
        BaseButton: { template: '<button><slot /></button>' },
        BaseBadge: true,
        BaseSpinner: true,
        BaseDialog: { props: ['isOpen'], template: '<div v-if="isOpen"><slot /></div>' },
      },
    },
  })
}

const article = {
  id: 'article-1',
  categoryId: null,
  category: null,
  titleEn: 'How to reset your password',
  titleAr: 'كيفية إعادة تعيين كلمة المرور',
  bodyEn: 'Step 1. Step 2.',
  bodyAr: 'الخطوة ١. الخطوة ٢.',
  isPublished: true,
  sortOrder: 0,
  updatedAt: new Date(),
}

describe('KbArticleView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
    push.mockReset()
    vi.clearAllMocks()
  })

  it('renders the body as text — a script tag appears literally and creates no element', async () => {
    ;(api.get as any).mockResolvedValueOnce({
      data: { ...article, bodyEn: '<script>alert(1)</script>' },
    })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('<script>alert(1)</script>')
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.html()).not.toContain('<script>alert(1)</script>')
  })

  it('hides Publish, Unpublish, Edit, and Delete without kb.manage', async () => {
    ;(api.get as any).mockResolvedValueOnce({ data: article })

    const wrapper = mountView()
    await flushPromises()

    const text = wrapper.text()
    expect(text).not.toContain('Publish')
    expect(text).not.toContain('Edit')
    expect(text).not.toContain('Delete')
  })

  it('shows authoring controls with kb.manage and publishes on click', async () => {
    ;(api.get as any).mockResolvedValueOnce({ data: { ...article, isPublished: false } })
    ;(api.get as any).mockResolvedValueOnce({ data: [] }) // categories for the edit form
    ;(api.post as any).mockResolvedValueOnce({ data: { ...article, isPublished: true } })
    ;(api.get as any).mockResolvedValueOnce({ data: { ...article, isPublished: true } }) // reload after publish

    const auth = useAuthStore()
    auth.user = {
      id: 'user1', email: 'admin@test.local', fullNameEn: 'Admin', fullNameAr: 'إداري',
      branchId: 'branch1', departmentId: 'dept1', roleId: 'role1',
    } as any
    auth.permissions = ['kb.read', 'kb.manage']

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Publish')

    const publishButton = wrapper.findAll('button').find(b => b.text() === 'Publish')
    await publishButton!.trigger('click')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/kb/articles/article-1/publish')
  })

  it('renders a not-found state on 404, not a permission message', async () => {
    ;(api.get as any).mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND'))

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Article Not Found')
    expect(wrapper.text()).not.toContain('permission')
  })

  it('switches the rendered title and body with the language toggle', async () => {
    ;(api.get as any).mockResolvedValueOnce({ data: article })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('How to reset your password')
    expect(wrapper.text()).not.toContain('كيفية إعادة تعيين كلمة المرور')

    const toggle = wrapper.find('.lang-toggle')
    await toggle.trigger('click')

    expect(wrapper.text()).toContain('كيفية إعادة تعيين كلمة المرور')
    expect(wrapper.text()).not.toContain('How to reset your password')
  })
})
