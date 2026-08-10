import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create login component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty invalid form', () => {
    expect(component.loginForm.valid).toBeFalse();
  });

  it('should populate credentials when demo button clicked', () => {
    component.useDemo('admin@example.com', 'admin123');
    expect(component.loginForm.value.email).toBe('admin@example.com');
    expect(component.loginForm.value.password).toBe('admin123');
    expect(component.loginForm.valid).toBeTrue();
  });
});
