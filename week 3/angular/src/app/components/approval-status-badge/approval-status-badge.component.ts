import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-approval-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge" [ngClass]="status">
      {{ status }}
    </span>
  `
})
export class ApprovalStatusBadgeComponent {
  @Input({ required: true }) status: string = 'PENDING';
}
