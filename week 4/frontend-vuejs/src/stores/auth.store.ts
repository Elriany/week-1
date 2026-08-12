import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { User } from '../types/user';
import { authApi } from '../api/auth.api';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('access_token'));
  const user = ref<User | null>(
    localStorage.getItem('user_info')
      ? JSON.parse(localStorage.getItem('user_info')!)
      : null
  );

  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const role = computed(() => user.value?.role || null);
  const isAdmin = computed(() => user.value?.role === 'ADMIN');
  const isManager = computed(() => user.value?.role === 'MANAGER');
  const isEmployee = computed(() => user.value?.role === 'EMPLOYEE');

  async function login(email: string, password: string) {
    const res = await authApi.login(email, password);
    if (res.success && res.data) {
      token.value = res.data.accessToken;
      user.value = res.data.user;
      localStorage.setItem('access_token', res.data.accessToken);
      localStorage.setItem('user_info', JSON.stringify(res.data.user));
    }
    return res;
  }

  async function fetchCurrentUser() {
    if (!token.value) return;
    try {
      const res = await authApi.me();
      if (res.success && res.data) {
        user.value = res.data;
        localStorage.setItem('user_info', JSON.stringify(res.data));
      }
    } catch {
      logout();
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
  }

  return {
    token,
    user,
    isAuthenticated,
    role,
    isAdmin,
    isManager,
    isEmployee,
    login,
    fetchCurrentUser,
    logout,
  };
});
