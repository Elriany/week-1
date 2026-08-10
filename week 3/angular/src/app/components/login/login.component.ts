import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="card auth-card">
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <h2>Approval System</h2>
        <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.25rem;">
          Angular Frontend (Node.js Backend)
        </p>
      </div>

      <div *ngIf="errorMessage" class="alert alert-danger">
        {{ errorMessage }}
      </div>

      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label class="form-label" for="email">Email Address</label>
          <input
            id="email"
            type="email"
            class="form-control"
            [class.is-invalid]="isFieldInvalid('email')"
            formControlName="email"
            placeholder="admin@example.com"
          />
          <div *ngIf="isFieldInvalid('email')" class="invalid-feedback">
            Please enter a valid email address.
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="password">Password</label>
          <input
            id="password"
            type="password"
            class="form-control"
            [class.is-invalid]="isFieldInvalid('password')"
            formControlName="password"
            placeholder="••••••••"
          />
          <div *ngIf="isFieldInvalid('password')" class="invalid-feedback">
            Password is required.
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-block" [disabled]="loading">
          <span *ngIf="loading" class="spinner" style="width: 1rem; height: 1rem; margin-right: 0.5rem;"></span>
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
        <p style="font-size: 0.8125rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.5rem;">
          ⚡ Quick Demo Logins:
        </p>
        <div class="demo-btn-group">
          <button type="button" class="btn-demo" (click)="useDemo('admin@example.com', 'admin123')">
            Admin Demo
          </button>
          <button type="button" class="btn-demo" (click)="useDemo('manager@example.com', 'manager123')">
            Manager Demo
          </button>
          <button type="button" class="btn-demo" (click)="useDemo('employee@example.com', 'employee123')">
            Employee Demo
          </button>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = false;
  errorMessage = '';

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  useDemo(email: string, pass: string): void {
    this.loginForm.patchValue({ email, password: pass });
    this.loginForm.markAllAsTouched();
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email!, password!).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.router.navigate(['/approvals']);
        } else {
          this.errorMessage = res.message || 'Login failed.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Authentication error. Please check your connection.';
      }
    });
  }
}
