import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
  },
  {
    path: '/requests',
    name: 'RequestList',
    component: () => import('../views/requests/RequestListView.vue'),
  },
  {
    path: '/requests/create',
    name: 'RequestCreate',
    component: () => import('../views/requests/RequestCreateView.vue'),
    meta: { roles: ['EMPLOYEE', 'MANAGER'] },
  },
  {
    path: '/requests/:id',
    name: 'RequestDetail',
    component: () => import('../views/requests/RequestDetailView.vue'),
  },
  {
    path: '/department',
    name: 'MyDepartment',
    component: () => import('../views/employees/EmployeeListView.vue'),
    meta: { roles: ['MANAGER'] },
  },
  {
    path: '/employees',
    name: 'EmployeeList',
    component: () => import('../views/employees/EmployeeListView.vue'),
    meta: { roles: ['ADMIN'] },
  },
  {
    path: '/departments',
    name: 'DepartmentList',
    component: () => import('../views/departments/DepartmentListView.vue'),
    meta: { roles: ['ADMIN'] },
  },
  {
    path: '/managers',
    name: 'ManagerList',
    component: () => import('../views/managers/ManagerListView.vue'),
    meta: { roles: ['ADMIN'] },
  },
  {
    path: '/status-requests',
    name: 'StatusRequestList',
    component: () => import('../views/status-requests/StatusRequestListView.vue'),
    meta: { roles: ['ADMIN'] },
  },
  {
    path: '/audit',
    name: 'AuditHistory',
    component: () => import('../views/AuditHistoryView.vue'),
    meta: { roles: ['ADMIN'] },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();
  const isPublic = to.meta.public;

  if (!isPublic && !authStore.isAuthenticated) {
    return next({ name: 'Login' });
  }

  if (isPublic && authStore.isAuthenticated) {
    return next({ name: 'Dashboard' });
  }

  if (to.meta.roles && Array.isArray(to.meta.roles)) {
    const userRole = authStore.role;
    if (!userRole || !(to.meta.roles as string[]).includes(userRole)) {
      return next({ name: 'Dashboard' });
    }
  }

  next();
});

export default router;
