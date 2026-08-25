import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth.store'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'

vi.mock('@/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/api/client')>('@/api/client')
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

const USER = {
  id: 'u-1',
  email: 'admin@azm.local',
  fullNameEn: 'System Administrator',
  fullNameAr: 'مسؤول النظام',
  isActive: true,
  branchId: 'b-1',
  departmentId: 'd-1',
  roleId: 'r-1',
  role: { id: 'r-1', code: 'ADMIN', nameEn: 'Administrator', nameAr: 'المسؤول' },
}

const LOGIN_RESPONSE = {
  data: {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: USER,
    permissions: ['users.read', 'roles.read'],
  },
}

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.mocked(api.get).mockReset()
    vi.mocked(api.post).mockReset()
  })

  it('starts unauthenticated', () => {
    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
  })

  it('login stores the token, user and permissions', async () => {
    vi.mocked(api.post).mockResolvedValue(LOGIN_RESPONSE)
    const auth = useAuthStore()

    await auth.login('admin@azm.local', 'Passw0rd!')

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.accessToken).toBe('access-token')
    expect(auth.user?.email).toBe('admin@azm.local')
    expect(auth.permissions).toEqual(['users.read', 'roles.read'])
  })

  it('login persists both tokens to localStorage', async () => {
    vi.mocked(api.post).mockResolvedValue(LOGIN_RESPONSE)
    await useAuthStore().login('admin@azm.local', 'Passw0rd!')

    expect(localStorage.getItem('azm-crm-access-token')).toBe('access-token')
    expect(localStorage.getItem('azm-crm-refresh-token')).toBe('refresh-token')
  })

  it('login failure leaves the store unauthenticated', async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError(401, 'UNAUTHORIZED'))
    const auth = useAuthStore()

    await expect(auth.login('admin@azm.local', 'wrong')).rejects.toBeInstanceOf(ApiError)

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.accessToken).toBeNull()
    expect(localStorage.getItem('azm-crm-access-token')).toBeNull()
  })

  it('logout clears state and storage', async () => {
    vi.mocked(api.post).mockResolvedValue(LOGIN_RESPONSE)
    const auth = useAuthStore()
    await auth.login('admin@azm.local', 'Passw0rd!')

    auth.logout()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
    expect(auth.permissions).toEqual([])
    expect(localStorage.getItem('azm-crm-access-token')).toBeNull()
  })

  it('can() reflects the granted permissions', async () => {
    vi.mocked(api.post).mockResolvedValue(LOGIN_RESPONSE)
    const auth = useAuthStore()
    await auth.login('admin@azm.local', 'Passw0rd!')

    expect(auth.can('users.read')).toBe(true)
    expect(auth.can('users.deactivate')).toBe(false)
  })

  it('can() is false before sign-in', () => {
    expect(useAuthStore().can('users.read')).toBe(false)
  })

  it('roleCode exposes the role code', async () => {
    vi.mocked(api.post).mockResolvedValue(LOGIN_RESPONSE)
    const auth = useAuthStore()
    await auth.login('admin@azm.local', 'Passw0rd!')

    expect(auth.roleCode).toBe('ADMIN')
  })

  it('restore() is a no-op with no persisted token', async () => {
    const auth = useAuthStore()
    await auth.restore()

    expect(auth.isAuthenticated).toBe(false)
    expect(api.get).not.toHaveBeenCalled()
  })

  it('restore() rehydrates the session from a persisted token', async () => {
    localStorage.setItem('azm-crm-access-token', 'persisted-token')
    vi.mocked(api.get).mockResolvedValue({ data: { user: USER, permissions: ['users.read'] } })

    const auth = useAuthStore()
    await auth.restore()

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user?.id).toBe('u-1')
    expect(auth.can('users.read')).toBe(true)
  })

  it('restore() discards a token the server rejects', async () => {
    localStorage.setItem('azm-crm-access-token', 'stale-token')
    vi.mocked(api.get).mockRejectedValue(new ApiError(401, 'UNAUTHORIZED'))

    const auth = useAuthStore()
    await auth.restore()

    expect(auth.isAuthenticated).toBe(false)
    expect(localStorage.getItem('azm-crm-access-token')).toBeNull()
    expect(auth.isRestoring).toBe(false)
  })

  it('survives localStorage throwing', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded')
    })
    vi.mocked(api.post).mockResolvedValue(LOGIN_RESPONSE)

    const auth = useAuthStore()
    await expect(auth.login('admin@azm.local', 'Passw0rd!')).resolves.toBeUndefined()

    // In-memory session still works even though it will not survive a reload.
    expect(auth.isAuthenticated).toBe(true)
    vi.restoreAllMocks()
  })

  it('preserves the Arabic display name', async () => {
    vi.mocked(api.post).mockResolvedValue(LOGIN_RESPONSE)
    const auth = useAuthStore()
    await auth.login('admin@azm.local', 'Passw0rd!')

    expect(auth.user?.fullNameAr).toBe('مسؤول النظام')
  })
})
