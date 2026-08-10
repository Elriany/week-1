import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApprovalService } from '../../services/approval.service';

@Component({
  selector: 'app-approval-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="container" style="max-width: 640px;">
      <div class="page-header">
        <h1 class="page-title">Create Approval Request</h1>
        <a routerLink="/approvals" class="btn btn-secondary">← Back to List</a>
      </div>

      <div class="card">
        <div *ngIf="errorMessage" class="alert alert-danger">
          {{ errorMessage }}
        </div>

        <form [formGroup]="createForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label" for="title">Request Title *</label>
            <input
              id="title"
              type="text"
              class="form-control"
              [class.is-invalid]="isFieldInvalid('title')"
              formControlName="title"
              placeholder="e.g. New Laptop Purchase Request"
            />
            <div *ngIf="isFieldInvalid('title')" class="invalid-feedback">
              <span *ngIf="createForm.get('title')?.errors?.['required']">Title is required.</span>
              <span *ngIf="createForm.get('title')?.errors?.['minlength']">Title must be at least 3 characters.</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="description">Detailed Description *</label>
            <textarea
              id="description"
              rows="4"
              class="form-control"
              [class.is-invalid]="isFieldInvalid('description')"
              formControlName="description"
              placeholder="Provide context and details for your approval request..."
            ></textarea>
            <div *ngIf="isFieldInvalid('description')" class="invalid-feedback">
              <span *ngIf="createForm.get('description')?.errors?.['required']">Description is required.</span>
              <span *ngIf="createForm.get('description')?.errors?.['minlength']">Description must be at least 5 characters.</span>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
            <a routerLink="/approvals" class="btn btn-secondary">Cancel</a>
            <button type="submit" class="btn btn-primary" [disabled]="loading">
              <span *ngIf="loading" class="spinner" style="width: 1rem; height: 1rem; margin-right: 0.5rem;"></span>
              {{ loading ? 'Submitting...' : 'Submit Request' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class ApprovalCreateComponent {
  private fb = inject(FormBuilder);
  private approvalService = inject(ApprovalService);
  private router = inject(Router);

  loading = false;
  errorMessage = '';

  createForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(5)]]
  });

  isFieldInvalid(field: string): boolean {
    const control = this.createForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const payload = {
      title: this.createForm.value.title!,
      description: this.createForm.value.description!
    };

    this.approvalService.createApproval(payload).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.router.navigate(['/approvals']);
        } else {
          this.errorMessage = res.message || 'Failed to create approval request.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to create approval request. Check backend status.';
      }
    });
  }
}
