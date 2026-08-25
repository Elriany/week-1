import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, setTokenProvider, setUnauthorizedHandler } from '@/api/client';

export interface AuthUser {
  id: string;
  email: string;
  fullNameEn: string;
  fullNameAr: string;
  isActive: boolean;
  branchId: string;
  departmentId: string;
  roleId: string;
  role?: { id: string; code: string; nameEn: string; nameAr: string };
}

const ACCESS_TOKEN_KEY = 'azm-crm-access-token';
const REFRESH_TOKEN_KEY = 'azm-crm-refresh-token';

/** localStorage throws in Safari private mode and under some enterprise policies. */
function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Session simply will not survive a reload. The app still works.
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const permissions = ref<string[]>([]);
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  /** True while `restore()` is verifying a persisted token against the API. */
  const isRestoring = ref(false);

  const isAuthenticated = computed(() => accessToken.value !== null && user.value !== null);
  const roleCode = computed(() => user.value?.role?.code ?? '');

  function can(permission: string): boolean {
    return permissions.value.includes(permission);
  }

  function setTokens(access: string | null, refresh: string | null): void {
    accessToken.value = access;
    refreshToken.value = refresh;
    writeStorage(ACCESS_TOKEN_KEY, access);
    writeStorage(REFRESH_TOKEN_KEY, refresh);
  }

  function clear(): void {
    user.value = null;
    permissions.value = [];
    setTokens(null, null);
  }

  async function login(email: string, password: string): Promise<void> {
    const response = await api.post('/auth/login', { email, password });
    setTokens(response.data.accessToken, response.data.refreshToken);
    user.value = response.data.user;
    permissions.value = response.data.permissions ?? [];
  }

  function logout(): void {
    clear();
  }

  async function loadCurrentUser(): Promise<void> {
    const response = await api.get('/auth/me');
    user.value = response.data.user;
    permissions.value = response.data.permissions ?? [];
  }

  /**
   * Rehydrates a session from localStorage. Must be awaited before the first
   * navigation guard runs, otherwise a reload on a protected route bounces the
   * user to the login screen despite holding a valid token.
   */
  async function restore(): Promise<void> {
    const storedAccess = readStorage(ACCESS_TOKEN_KEY);
    const storedRefresh = readStorage(REFRESH_TOKEN_KEY);
    if (!storedAccess) return;

    accessToken.value = storedAccess;
    refreshToken.value = storedRefresh;
    isRestoring.value = true;

    try {
      await loadCurrentUser();
    } catch {
      // Expired or revoked — drop it and let the guard redirect to login.
      clear();
    } finally {
      isRestoring.value = false;
    }
  }

  // Wire the client to this store: it reads the token for every request and
  // calls back here when the API reports the session is no longer valid.
  setTokenProvider(() => accessToken.value);
  setUnauthorizedHandler(() => {
    if (!isRestoring.value) clear();
  });

  return {
    user,
    permissions,
    accessToken,
    refreshToken,
    isRestoring,
    isAuthenticated,
    roleCode,
    can,
    login,
    logout,
    loadCurrentUser,
    restore,
  };
});
