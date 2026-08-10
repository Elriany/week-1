import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from './auth.service';

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return false for isAuthenticated when token is absent', () => {
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('should return true for isAuthenticated when token is present', () => {
    localStorage.setItem('auth_token', 'sample-token');
    expect(authService.isAuthenticated()).toBe(true);
  });

  it('should clear localStorage on logout', () => {
    localStorage.setItem('auth_token', 'sample-token');
    localStorage.setItem('auth_user', JSON.stringify({ email: 'admin@example.com' }));

    authService.logout();

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
  });
});
