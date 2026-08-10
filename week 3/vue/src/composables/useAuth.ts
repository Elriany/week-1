import { ref, computed } from 'vue';
import type { User, LoginRequest } from '../types/user';
import { authService } from '../services/auth.service';

const currentUser = ref<User | null>(authService.getCurrentUser());

export function useAuth() {
  const isAuthenticated = computed(() => !!localStorage.getItem('auth_token'));

  async function login(credentials: LoginRequest) {
    const res = await authService.login(credentials);
    if (res.success && res.data) {
      localStorage.setItem('auth_token', res.data.token);
      localStorage.setItem('auth_user', JSON.stringify(res.data.user));
      currentUser.value = res.data.user;
    }
    return res;
  }

  function logout() {
    authService.logout();
    currentUser.value = null;
  }

  return {
    currentUser,
    isAuthenticated,
    login,
    logout
  };
}
