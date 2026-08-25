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
        path: 'roles',
        name: 'roles',
        component: () => import('@/views/RolesView.vue'),
        meta: { titleKey: 'nav.roles', permission: 'roles.read' },
      },
      {
        path: 'about',
        name: 'about',
        component: () => import('@/views/AboutView.vue'),
        meta: { titleKey: 'nav.about' },
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

  if (to.meta.permission && !auth.can(to.meta.permission)) {
    return { name: 'dashboard' }
  }

  return true
})

router.afterEach(to => {
  const titleKey = to.meta.titleKey || 'app.title'
  document.title = i18n.global.t(titleKey)
})

export default router
