import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should perform login and store token', () => {
    const mockResponse = {
      success: true,
      message: 'User authenticated successfully.',
      data: {
        token: 'mock-jwt-token',
        tokenType: 'Bearer',
        user: {
          id: 'usr-1',
          name: 'System Admin',
          email: 'admin@example.com',
          role: 'Admin' as const
        }
      }
    };

    service.login('admin@example.com', 'admin123').subscribe((res) => {
      expect(res.success).toBeTrue();
      expect(service.token).toBe('mock-jwt-token');
      expect(service.currentUserValue?.email).toBe('admin@example.com');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should clear token and user on logout', () => {
    localStorage.setItem('auth_token', 'mock-token');
    service.logout();
    expect(service.token).toBeNull();
    expect(service.currentUserValue).toBeNull();
  });
});
