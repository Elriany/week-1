import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AppSidebar from '../AppSidebar.vue'
import { i18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth.store'

vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/' }),
  RouterLink: { template: '<a><slot /></a>' },
}))

function mountSidebar() {
  return mount(AppSidebar, {
    global: {
      plugins: [i18n],
    },
  })
}

function labels(wrapper: ReturnType<typeof mountSidebar>): string[] {
  return wrapper.findAll('.label').map(el => el.text())
}

function groups(wrapper: ReturnType<typeof mountSidebar>): string[] {
  return wrapper.findAll('.nav-group-heading').map(el => el.text())
}

function setRole(roleCode: string, permissions: string[]) {
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
}

describe('AppSidebar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
  })

  it('shows only the portal entries for a CUSTOMER', () => {
    setRole('CUSTOMER', ['tickets.read', 'tickets.create', 'kb.read'])
    const wrapper = mountSidebar()

    // Items are grouped, so the order is work-then-knowledge, but the SET a
    // role can see is the security-relevant part and must not have widened.
    expect(labels(wrapper)).toEqual(['My Tickets', 'New Request', 'Help Centre'])
  })

  // A CUSTOMER holds tickets.read, so a grouping built from the unfiltered
  // list would expose the staff links. This is the regression that matters.
  it('never shows a CUSTOMER the staff or admin groups', () => {
    setRole('CUSTOMER', ['tickets.read', 'tickets.create', 'kb.read'])
    const wrapper = mountSidebar()

    expect(groups(wrapper)).not.toContain('Administration')
    expect(labels(wrapper)).not.toContain('Tickets')
    expect(labels(wrapper)).not.toContain('Users')
    expect(labels(wrapper)).not.toContain('Dashboard')
  })

  // A heading over nothing reads as a broken menu.
  it('renders no heading for a group with no visible items', () => {
    setRole('AGENT', ['tickets.read'])
    const wrapper = mountSidebar()

    expect(groups(wrapper)).toEqual(['Work'])
    expect(groups(wrapper)).not.toContain('Knowledge')
    expect(groups(wrapper)).not.toContain('Administration')
  })

  it('shows the staff entries for an AGENT and hides the portal entries', () => {
    setRole('AGENT', ['tickets.read', 'customers.read', 'kb.read'])
    const items = labels(mountSidebar())

    expect(items).toEqual(['Dashboard', 'Customers', 'Tickets', 'Help Centre'])
    expect(items).not.toContain('My Tickets')
    expect(items).not.toContain('New Request')
    expect(items).not.toContain('Reports')
  })

  it('shows every entry for an ADMIN', () => {
    setRole('ADMIN', [
      'users.read',
      'customers.read',
      'tickets.read',
      'reports.read',
      'kb.read',
      'roles.read',
    ])
    const items = labels(mountSidebar())

    // Grouped order: Work, then Knowledge, then Administration.
    expect(items).toEqual([
      'Dashboard',
      'Customers',
      'Tickets',
      'Reports',
      'Help Centre',
      'Users',
      'Roles',
    ])
    expect(groups(mountSidebar())).toEqual(['Work', 'Knowledge', 'Administration'])
  })
})
