import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AppBreadcrumb from '../AppBreadcrumb.vue'
import { i18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth.store'
import { useAppStore } from '@/stores/app.store'

let currentMeta: Record<string, unknown> = {}

const ROUTES = [
  { name: 'tickets', meta: { titleKey: 'nav.tickets', permission: 'tickets.read' } },
  { name: 'admin', meta: { titleKey: 'nav.admin', permission: 'admin.manage' } },
]

vi.mock('vue-router', () => ({
  useRoute: () => ({ meta: currentMeta }),
  useRouter: () => ({ getRoutes: () => ROUTES }),
  RouterLink: { props: ['to'], template: '<a class="crumb-link"><slot /></a>' },
}))

function mountCrumb() {
  return mount(AppBreadcrumb, { global: { plugins: [i18n] } })
}

describe('AppBreadcrumb', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
    currentMeta = {}
    useAuthStore().permissions = ['tickets.read', 'admin.manage']
  })

  // A one-item trail on a top-level route is noise.
  it('renders nothing without meta.parent', () => {
    currentMeta = { titleKey: 'nav.tickets' }

    expect(mountCrumb().find('nav').exists()).toBe(false)
  })

  it('renders parent then current record', () => {
    currentMeta = { titleKey: 'nav.tickets', parent: 'tickets' }
    useAppStore().setBreadcrumbItemLabel('TKT-000123')

    const wrapper = mountCrumb()

    expect(wrapper.find('.crumb-link').text()).toBe('Tickets')
    expect(wrapper.find('[aria-current="page"]').text()).toBe('TKT-000123')
  })

  // The trail must never end in a blank segment while the record loads.
  it('falls back to the route title when no item label is set', () => {
    currentMeta = { titleKey: 'nav.tickets', parent: 'tickets' }

    expect(mountCrumb().find('[aria-current="page"]').text()).toBe('Tickets')
  })

  // admin-sla is gated on sla.manage while its parent admin needs admin.manage,
  // so a link there would bounce a user who holds only the former.
  it('renders an unreachable parent as text, not a link', () => {
    currentMeta = { titleKey: 'nav.sla', parent: 'admin' }
    useAuthStore().permissions = ['sla.manage']

    const wrapper = mountCrumb()

    expect(wrapper.find('.crumb-link').exists()).toBe(false)
    expect(wrapper.text()).toContain('Administration')
  })

  it('links a parent the user can reach', () => {
    currentMeta = { titleKey: 'nav.sla', parent: 'admin' }
    useAuthStore().permissions = ['admin.manage']

    expect(mountCrumb().find('.crumb-link').exists()).toBe(true)
  })
})
