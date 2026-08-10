import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <header class="navbar" *ngIf="authService.currentUser$ | async as user">
      <a routerLink="/approvals" class="navbar-brand">
        🏢 Approval Management System
      </a>
      <div class="navbar-user">
        <span>
          <strong>{{ user.name }}</strong> ({{ user.email }})
          <span class="role-badge">{{ user.role }}</span>
        </span>
        <button class="btn-logout" (click)="onLogout()">Logout</button>
      </div>
    </header>
  `
})
export class NavComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
