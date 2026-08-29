import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { i18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth.store'

declare module 'vue-router' {
  interface RouteMeta {
    titleKey?: string
    /** Routes reachable without a session. Everything else requires one. */
    public?: boolean
    /** Permission code the route requires, checked after authentication. */
    permission?: string
    /** Route name of the list this detail page belongs to. Drives the
     *  breadcrumb; present only on depth-2 routes. */
    parent?: string
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { titleKey: 'auth.signIn', public: true },
  },
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { titleKey: 'nav.dashboard' },
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/views/UsersView.vue'),
        meta: { titleKey: 'nav.users', permission: 'users.read' },
      },
      {
        path: 'customers',
        name: 'customers',
        component: () => import('@/views/CustomersView.vue'),
        meta: { titleKey: 'nav.customers', permission: 'customers.read' },
      },
      {
        path: 'customers/:id',
        name: 'customer-detail',
        component: () => import('@/views/CustomerDetailView.vue'),
        meta: { titleKey: 'nav.customers', permission: 'customers.read', parent: 'customers' },
      },
      {
        path: 'tickets',
        name: 'tickets',
        component: () => import('@/views/TicketsView.vue'),
        meta: { titleKey: 'nav.tickets', permission: 'tickets.read' },
      },
      {
        path: 'tickets/:id',
        name: 'ticket-detail',
        component: () => import('@/views/TicketDetailView.vue'),
        meta: { titleKey: 'nav.tickets', permission: 'tickets.read', parent: 'tickets' },
      },
      {
        path: 'reports',
        name: 'reports',
        component: () => import('@/views/ReportsView.vue'),
        meta: { titleKey: 'nav.reports', permission: 'reports.read' },
      },
      {
        path: 'kb',
        name: 'kb',
        component: () => import('@/views/KnowledgeBaseView.vue'),
        meta: { titleKey: 'nav.kb', permission: 'kb.read' },
      },
      {
        path: 'kb/:id',
        name: 'kb-article',
        component: () => import('@/views/KbArticleView.vue'),
        meta: { titleKey: 'nav.kb', permission: 'kb.read', parent: 'kb' },
      },
      {
        path: 'portal',
        name: 'portal-tickets',
        component: () => import('@/views/portal/PortalTicketsView.vue'),
        meta: { titleKey: 'nav.myTickets', permission: 'tickets.read' },
      },
      {
        path: 'portal/new',
        name: 'portal-new-ticket',
        component: () => import('@/views/portal/PortalNewTicketView.vue'),
        meta: { titleKey: 'nav.newRequest', permission: 'tickets.create' },
      },
      {
        path: 'portal/tickets/:id',
        name: 'portal-ticket-detail',
        component: () => import('@/views/portal/PortalTicketDetailView.vue'),
        meta: { titleKey: 'nav.myTickets', permission: 'tickets.read', parent: 'portal-tickets' },
      },
      {
        path: 'roles',
        name: 'roles',
        component: () => import('@/views/RolesView.vue'),
        meta: { titleKey: 'nav.roles', permission: 'roles.read' },
      },
      {
        path: 'admin',
        name: 'admin',
        component: () => import('@/views/admin/AdminView.vue'),
        meta: { titleKey: 'nav.admin', permission: 'admin.manage' },
      },
      {
        path: 'admin/sla',
        name: 'admin-sla',
        component: () => import('@/views/admin/SlaPoliciesView.vue'),
        meta: { titleKey: 'nav.sla', permission: 'sla.manage', parent: 'admin' },
      },
      {
        path: 'audit',
        name: 'audit',
        component: () => import('@/views/AuditView.vue'),
        meta: { titleKey: 'nav.audit', permission: 'audit.read' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { titleKey: 'nav.notFound', public: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(to => {
  const auth = useAuthStore()

  if (!to.meta.public && !auth.isAuthenticated) {
    // Remember where they were headed so login can send them back.
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }

  // A customer has no use for the agent workspace. Redirect at the router so a
  // bookmarked "/" lands in the portal too, not only a fresh sign-in.
  if (auth.roleCode === 'CUSTOMER' && to.name === 'dashboard') {
    return { name: 'portal-tickets' }
  }

  // `tickets.read` is also held by CUSTOMER, and the API scopes the staff list
  // by branch rather than by customer — so the permission check alone would
  // let a customer browse other customers' tickets. The durable fix is a
  // distinct backend permission for the staff list; that is out of scope for
  // this frontend-only story, so the gap is closed here instead.
  if (auth.roleCode === 'CUSTOMER' && (to.name === 'tickets' || to.name === 'ticket-detail')) {
    return { name: 'portal-tickets' }
  }

  // Carry the reason, so the dashboard can say what happened. A silent bounce
  // is indistinguishable from a broken link. The two CUSTOMER redirects above
  // stay silent on purpose — they route a customer to their own home rather
  // than denying them anything, so a warning there would be alarming and wrong.
  if (to.meta.permission && !auth.can(to.meta.permission)) {
    return { name: 'dashboard', query: { denied: '1' } }
  }

  return true
})

router.afterEach(to => {
  const titleKey = to.meta.titleKey || 'app.title'
  document.title = i18n.global.t(titleKey)
})

export default router
