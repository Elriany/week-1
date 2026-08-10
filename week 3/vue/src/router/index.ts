import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { authService } from '../services/auth.service';
import LoginView from '../views/LoginView.vue';
import ApprovalsListView from '../views/ApprovalsListView.vue';
import ApprovalCreateView from '../views/ApprovalCreateView.vue';

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/approvals' },
  { path: '/login', name: 'Login', component: LoginView },
  { 
    path: '/approvals', 
    name: 'ApprovalsList', 
    component: ApprovalsListView, 
    meta: { requiresAuth: true } 
  },
  { 
    path: '/approvals/create', 
    name: 'ApprovalCreate', 
    component: ApprovalCreateView, 
    meta: { requiresAuth: true } 
  },
  { path: '/:pathMatch(.*)*', redirect: '/approvals' }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const loggedIn = authService.isAuthenticated();
  if (to.matched.some(record => record.meta.requiresAuth) && !loggedIn) {
    next('/login');
  } else {
    next();
  }
});

export default router;
