import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApprovalService } from '../../services/approval.service';
import { Approval } from '../../models/approval.model';
import { ApprovalStatusBadgeComponent } from '../approval-status-badge/approval-status-badge.component';

@Component({
  selector: 'app-approval-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ApprovalStatusBadgeComponent],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Approval Requests</h1>
          <p style="color: var(--text-muted); font-size: 0.875rem;">
            Manage and view organizational request workflows
          </p>
        </div>
        <a routerLink="/approvals/create" class="btn btn-primary">
          + New Approval
        </a>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="card state-container">
        <div class="spinner"></div>
        <p style="margin-top: 1rem; color: var(--text-muted);">Loading approval requests...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage && !loading" class="card state-container">
        <div class="alert alert-danger" style="display: inline-block;">
          {{ errorMessage }}
        </div>
        <div>
          <button class="btn btn-secondary" (click)="fetchApprovals()">Retry</button>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && !errorMessage && approvals.length === 0" class="card state-container">
        <h3>No approval requests found</h3>
        <p style="color: var(--text-muted); margin-top: 0.5rem; margin-bottom: 1.5rem;">
          Get started by creating your first approval request.
        </p>
        <a routerLink="/approvals/create" class="btn btn-primary">+ New Approval</a>
      </div>

      <!-- Approvals Table -->
      <div *ngIf="!loading && !errorMessage && approvals.length > 0" class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Description</th>
              <th>Requester ID</th>
              <th>Status</th>
              <th>Created Date</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of approvals">
              <td><code>{{ item.id }}</code></td>
              <td style="font-weight: 600;">{{ item.title }}</td>
              <td>{{ item.description }}</td>
              <td>{{ item.requesterId }}</td>
              <td>
                <app-approval-status-badge [status]="item.status"></app-approval-status-badge>
              </td>
              <td>{{ item.createdAt | date:'mediumDate' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class ApprovalListComponent implements OnInit {
  private approvalService = inject(ApprovalService);

  approvals: Approval[] = [];
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.fetchApprovals();
  }

  fetchApprovals(): void {
    this.loading = true;
    this.errorMessage = '';

    this.approvalService.getApprovals().subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.data) {
          this.approvals = res.data.approvals || [];
        } else {
          this.errorMessage = res.message || 'Unable to load approval requests.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Unable to load approval requests. Please check backend connection.';
      }
    });
  }
}
