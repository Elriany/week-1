<template>
  <div class="timeline-container">
    <div v-if="!items || items.length === 0" class="empty-timeline">
      No activity recorded yet.
    </div>

    <div v-else class="timeline-list">
      <div v-for="item in items" :key="item.id" class="timeline-item">
        <div class="timeline-badge" :class="getBadgeColor(item.action)">
          <i :class="['pi', getIcon(item.action)]"></i>
        </div>

        <div class="timeline-content">
          <div class="timeline-header">
            <span class="action-name">{{ formatAction(item.action) }}</span>
            <span class="timeline-date">{{ formatDate(item.createdAt) }}</span>
          </div>

          <div class="performer-text">
            By <strong>{{ item.performerFirstName }} {{ item.performerLastName }}</strong>
            <span class="performer-role">({{ item.performerRole }})</span>
            <span v-if="item.requestNumber" class="request-tag">
              • {{ item.requestNumber }}
            </span>
          </div>

          <div v-if="item.fromStatus || item.toStatus" class="status-transition">
            Status: <span class="status-chip">{{ item.fromStatus || 'INIT' }}</span>
            <i class="pi pi-arrow-right arrow-icon"></i>
            <span class="status-chip active">{{ item.toStatus }}</span>
          </div>

          <div v-if="item.comment" class="timeline-comment" :class="{ 'rejection-box': item.action === 'REJECTED' }">
            <i class="pi pi-comment comment-icon"></i>
            <span>{{ item.comment }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ApprovalHistory } from '../../types/history';

defineProps<{
  items: ApprovalHistory[];
}>();

function formatAction(action: string): string {
  return action.replace(/_/g, ' ');
}

function formatDate(isoStr: string): string {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getBadgeColor(action: string): string {
  switch (action) {
    case 'APPROVED':
    case 'ACTIVATION_APPROVED':
      return 'bg-success';
    case 'REJECTED':
    case 'ACTIVATION_REJECTED':
    case 'DEACTIVATION_REJECTED':
      return 'bg-danger';
    case 'SUBMITTED':
    case 'RESUBMITTED':
    case 'ACTIVATION_REQUESTED':
    case 'DEACTIVATION_REQUESTED':
      return 'bg-warning';
    default:
      return 'bg-info';
  }
}

function getIcon(action: string): string {
  switch (action) {
    case 'APPROVED':
    case 'ACTIVATION_APPROVED':
      return 'pi-check';
    case 'REJECTED':
    case 'ACTIVATION_REJECTED':
    case 'DEACTIVATION_REJECTED':
      return 'pi-times';
    case 'SUBMITTED':
    case 'ACTIVATION_REQUESTED':
    case 'DEACTIVATION_REQUESTED':
      return 'pi-send';
    case 'RESUBMITTED':
      return 'pi-refresh';
    case 'COMMENT_ADDED':
      return 'pi-comment';
    default:
      return 'pi-info-circle';
  }
}
</script>

<style scoped>
.timeline-container {
  padding: 0.5rem 0;
}

.empty-timeline {
  color: var(--text-muted);
  font-size: 0.875rem;
  text-align: center;
  padding: 1.5rem;
}

.timeline-list {
  position: relative;
  padding-left: 1.75rem;
}

.timeline-list::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--surface-200);
}

.timeline-item {
  position: relative;
  margin-bottom: 1.25rem;
}

.timeline-badge {
  position: absolute;
  left: -1.75rem;
  top: 2px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: white;
}

.bg-success { background: #16a34a; }
.bg-danger  { background: #dc2626; }
.bg-warning { background: #d97706; }
.bg-info    { background: #2563eb; }

.timeline-content {
  background: var(--surface-50);
  border: 1px solid var(--surface-200);
  border-radius: var(--radius-sm);
  padding: 0.75rem 1rem;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-name {
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--surface-900);
}

.timeline-date {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.performer-text {
  font-size: 0.8125rem;
  color: var(--text-main);
  margin-top: 0.25rem;
}

.performer-role {
  color: var(--text-muted);
  margin-left: 0.25rem;
}

.request-tag {
  color: var(--primary-600);
  font-weight: 500;
}

.status-transition {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.375rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.status-chip {
  padding: 0.125rem 0.375rem;
  background: var(--surface-200);
  border-radius: 0.25rem;
  font-weight: 600;
}

.status-chip.active {
  background: #e0e7ff;
  color: #3730a3;
}

.arrow-icon {
  font-size: 0.625rem;
}

.timeline-comment {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--surface-0);
  border: 1px solid var(--surface-200);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  color: var(--text-main);
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.rejection-box {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}

.comment-icon {
  margin-top: 0.125rem;
  color: var(--text-muted);
}
</style>
