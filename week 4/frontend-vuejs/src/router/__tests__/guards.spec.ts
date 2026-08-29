import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import router from '../index'
import { useAuthStore } from '@/stores/auth.store'

function signIn(roleCode: string, permissions: string[]) {
  const auth = useAuthStore()
  auth.user = {
    id: 'user-1',
    email: 'user@test.local',
    fullNameEn: 'Test User',
    fullNameAr: 'مستخدم تجريبي',
    isActive: true,
    branchId: 'branch-1',
    departmentId: 'dept-1',
    roleId: 'role-1',
    role: { id: 'role-1', code: roleCode, nameEn: roleCode, nameAr: roleCode },
  }
  auth.permissions = permissions
  ;(auth as any).accessToken = 'token'
}

describe('router guards', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    // Land on a neutral, always-public route first so each test's own push is a
    // genuine location change — Vue Router treats a push to the route it is
    // already resolved to as a no-op and skips guards, which would mask changes
    // to auth state between tests that don't also change the route.
    await router.replace('/login')
  })

  it('redirects a CUSTOMER navigating to dashboard to portal-tickets', async () => {
    signIn('CUSTOMER', ['tickets.read', 'tickets.create', 'kb.read'])
    await router.push({ name: 'dashboard' })
    expect(router.currentRoute.value.name).toBe('portal-tickets')
  })

  it('redirects a CUSTOMER navigating to the staff tickets list to portal-tickets', async () => {
    signIn('CUSTOMER', ['tickets.read', 'tickets.create', 'kb.read'])
    await router.push({ name: 'tickets' })
    expect(router.currentRoute.value.name).toBe('portal-tickets')
  })

  it('redirects a CUSTOMER navigating to a staff ticket detail to portal-tickets', async () => {
    signIn('CUSTOMER', ['tickets.read', 'tickets.create', 'kb.read'])
    await router.push({ name: 'ticket-detail', params: { id: 'ticket-1' } })
    expect(router.currentRoute.value.name).toBe('portal-tickets')
  })

  it('does not redirect a non-customer navigating to dashboard', async () => {
    signIn('AGENT', ['tickets.read'])
    await router.push({ name: 'dashboard' })
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('sends a signed-out user hitting dashboard to login, not the portal', async () => {
    await router.push({ name: 'dashboard' })
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('resolves portal-tickets for a CUSTOMER in one step — no redirect loop', async () => {
    signIn('CUSTOMER', ['tickets.read', 'tickets.create', 'kb.read'])
    await router.push({ name: 'portal-tickets' })
    expect(router.currentRoute.value.name).toBe('portal-tickets')
  })

  it('redirects a user without admin.manage away from /admin', async () => {
    signIn('AGENT', ['tickets.read'])
    await router.push({ name: 'admin' })
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('lets a user with admin.manage reach /admin', async () => {
    signIn('MANAGER', ['admin.manage'])
    await router.push({ name: 'admin' })
    expect(router.currentRoute.value.name).toBe('admin')
  })
// A silent bounce is indistinguishable from a broken link, so the guard
  // carries a flag the dashboard turns into a one-time explanation.
  it('carries a denied flag when a permission check blocks the navigation', async () => {
    signIn('AGENT', ['tickets.read'])
    await router.push({ name: 'audit' })

    expect(router.currentRoute.value.name).toBe('dashboard')
    expect(router.currentRoute.value.query.denied).toBe('1')
  })

  // These two route a customer to their own home rather than denying them
  // anything; a warning there would be alarming and wrong.
  it('keeps the two CUSTOMER redirects silent', async () => {
    signIn('CUSTOMER', ['tickets.read', 'tickets.create', 'kb.read'])

    await router.push({ name: 'dashboard' })
    expect(router.currentRoute.value.name).toBe('portal-tickets')
    expect(router.currentRoute.value.query.denied).toBeUndefined()

    await router.push({ name: 'tickets' })
    expect(router.currentRoute.value.name).toBe('portal-tickets')
    expect(router.currentRoute.value.query.denied).toBeUndefined()
  })
})
