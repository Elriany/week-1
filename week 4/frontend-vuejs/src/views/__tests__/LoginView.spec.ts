import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import LoginView from '../LoginView.vue'
import { i18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth.store'
import { ApiError } from '@/types/api'

const push = vi.fn()
const replace = vi.fn()
let currentQuery: Record<string, string> = {}

vi.mock('vue-router', () => ({
  useRouter: () => ({ push, replace }),
  useRoute: () => ({ query: currentQuery }),
  RouterLink: { template: '<a><slot /></a>' },
}))

function mountLogin() {
  return mount(LoginView, {
    global: {
      plugins: [i18n],
      stubs: { LanguageSwitcher: true },
    },
  })
}

async function fill(wrapper: ReturnType<typeof mountLogin>, email: string, password: string) {
  const [emailInput, passwordInput] = wrapper.findAll('input')
  await emailInput!.setValue(email)
  await passwordInput!.setValue(password)
}

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
    currentQuery = {}
    push.mockReset()
    replace.mockReset()
    localStorage.clear()
  })

  it('renders an email field and a password field', () => {
    const wrapper = mountLogin()
    const types = wrapper.findAll('input').map(input => input.attributes('type'))

    expect(types).toEqual(['email', 'password'])
  })

  it('forces Latin text direction on the credential fields', () => {
    // An RTL page must still put the caret on the left for an email address.
    const dirs = mountLogin().findAll('input').map(input => input.attributes('dir'))
    expect(dirs).toEqual(['ltr', 'ltr'])
  })

  it('shows validation errors and does not call the API when fields are empty', async () => {
    const auth = useAuthStore()
    const spy = vi.spyOn(auth, 'login')

    const wrapper = mountLogin()
    await wrapper.find('form').trigger('submit')

    expect(spy).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Email is required')
    expect(wrapper.text()).toContain('Password is required')
  })

  it('calls login with the trimmed email and navigates to the dashboard', async () => {
    const auth = useAuthStore()
    const spy = vi.spyOn(auth, 'login').mockResolvedValue(undefined)

    const wrapper = mountLogin()
    await fill(wrapper, '  admin@azm.local  ', 'Passw0rd!')
    await wrapper.find('form').trigger('submit')
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(spy).toHaveBeenCalledWith('admin@azm.local', 'Passw0rd!')
    expect(replace).toHaveBeenCalledWith({ name: 'dashboard' })
  })

  it('honours the redirect query so the user lands where they were headed', async () => {
    currentQuery = { redirect: '/users' }
    const auth = useAuthStore()
    vi.spyOn(auth, 'login').mockResolvedValue(undefined)

    const wrapper = mountLogin()
    await fill(wrapper, 'admin@azm.local', 'Passw0rd!')
    await wrapper.find('form').trigger('submit')
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(replace).toHaveBeenCalledWith('/users')
  })

  it('shows a generic message on 401 rather than echoing the server', async () => {
    const auth = useAuthStore()
    vi.spyOn(auth, 'login').mockRejectedValue(
      new ApiError(401, 'UNAUTHORIZED', undefined, undefined, 'Invalid email or password'),
    )

    const wrapper = mountLogin()
    await fill(wrapper, 'admin@azm.local', 'wrong')
    await wrapper.find('form').trigger('submit')
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.find('[role="alert"]').text()).toBe('Invalid email or password')
    expect(replace).not.toHaveBeenCalled()
  })

  it('shows a rate-limit message on 429', async () => {
    const auth = useAuthStore()
    vi.spyOn(auth, 'login').mockRejectedValue(new ApiError(429, 'TOO_MANY_REQUESTS'))

    const wrapper = mountLogin()
    await fill(wrapper, 'admin@azm.local', 'Passw0rd!')
    await wrapper.find('form').trigger('submit')
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.find('[role="alert"]').text()).toContain('Too many attempts')
  })

  it('reports an unreachable backend when the request never lands', async () => {
    const auth = useAuthStore()
    vi.spyOn(auth, 'login').mockRejectedValue(new TypeError('Failed to fetch'))

    const wrapper = mountLogin()
    await fill(wrapper, 'admin@azm.local', 'Passw0rd!')
    await wrapper.find('form').trigger('submit')
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.find('[role="alert"]').text()).toContain('Cannot reach the server')
  })

  it('renders Arabic labels when the locale is Arabic', async () => {
    i18n.global.locale.value = 'ar'
    const wrapper = mountLogin()

    expect(wrapper.text()).toContain('تسجيل الدخول')
  })

  describe('demo account shortcuts', () => {
    it('lists one shortcut per seeded demo account', () => {
      const wrapper = mountLogin()
      const emails = wrapper.findAll('.demo-account bdi').map(node => node.text())

      expect(emails).toEqual([
        'admin@azm.local',
        'manager@azm.local',
        'supervisor@azm.local',
        'agent@azm.local',
        'customer@azm.local',
        'riyadh.agent@azm.local',
      ])
    })

    it('signs in with the seeded password when a shortcut is clicked', async () => {
      const auth = useAuthStore()
      const spy = vi.spyOn(auth, 'login').mockResolvedValue(undefined)

      const wrapper = mountLogin()
      await wrapper.findAll('.demo-account')[1]!.trigger('click')
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(spy).toHaveBeenCalledWith('manager@azm.local', 'Passw0rd!')
      expect(replace).toHaveBeenCalledWith({ name: 'dashboard' })
    })

    it('surfaces a failed shortcut sign-in like any other failure', async () => {
      const auth = useAuthStore()
      vi.spyOn(auth, 'login').mockRejectedValue(new ApiError(401, 'UNAUTHORIZED'))

      const wrapper = mountLogin()
      await wrapper.findAll('.demo-account')[0]!.trigger('click')
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(wrapper.find('[role="alert"]').text()).toBe('Invalid email or password')
    })

    it('marks the riyadh account as belonging to another branch', () => {
      // The scope label is what tells a tester which account demonstrates
      // branch scoping; without it the two agent rows look identical.
      const wrapper = mountLogin()
      const scopes = wrapper.findAll('.demo-scope').map(node => node.text())

      expect(scopes[scopes.length - 1]).toBe('Riyadh')
      expect(scopes[0]).toBe('All branches')
    })
  })
})
