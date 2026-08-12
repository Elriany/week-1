<template>
  <AppLayout>
    <div class="request-list-page">
      <PageHeader
        :title="authStore.isEmployee ? 'My Approval Requests' : 'Approval Requests'"
        subtitle="Manage and track approval workflow requests"
      >
        <template #actions>
          <router-link
            v-if="authStore.isEmployee || authStore.isManager"
            to="/requests/create"
            class="btn-primary"
          >
            <i class="pi pi-plus"></i>
            <span>Create Request</span>
          </router-link>
        </template>
      </PageHeader>

      <!-- Filter Controls Bar -->
      <div class="filter-card">
        <div class="search-box">
          <i class="pi pi-search search-icon"></i>
          <input
            v-model="search"
            @input="debounceSearch"
            type="text"
            placeholder="Search by title or request number (e.g. APR-2026-000001)..."
            class="search-input"
          />
        </div>

        <div class="filter-group">
          <select v-model="statusFilter" @change="fetchRequests" class="filter-select">
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_MANAGER">Pending Manager</option>
            <option value="PENDING_ADMIN">Pending Admin</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="RESUBMITTED">Resubmitted</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select v-model="typeFilter" @change="fetchRequests" class="filter-select">
            <option value="">All Request Types</option>
            <option value="GENERAL_APPROVAL">General Approval</option>
            <option value="MANAGER_REQUEST">Manager Request</option>
            <option value="EMPLOYEE_ACTIVATION">Employee Activation</option>
            <option value="EMPLOYEE_DEACTIVATION">Employee Deactivation</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-box">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Loading requests...</span>
      </div>

      <!-- Empty State -->
      <EmptyState
        v-else-if="requests.length === 0"
        title="No approval requests found"
        message="There are no requests matching your filter criteria."
      >
        <template #action v-if="authStore.isEmployee || authStore.isManager">
          <router-link to="/requests/create" class="btn-primary">
            <i class="pi pi-plus"></i> Create First Request
          </router-link>
        </template>
      </EmptyState>

      <!-- Data Table -->
      <div v-else class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Request #</th>
              <th>Title</th>
              <th>Type</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Requester</th>
              <th>Submitted Date</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in requests" :key="req.id">
              <td class="req-number">{{ req.requestNumber }}</td>
              <td class="req-title">
                <router-link :to="`/requests/${req.id}`" class="title-link">
                  {{ req.title }}
                </router-link>
                <span v-if="req.attempt > 1" class="attempt-badge">Attempt #{{ req.attempt }}</span>
              </td>
              <td><span class="type-tag">{{ formatType(req.type) }}</span></td>
              <td><span :class="['priority-tag', req.priority?.toLowerCase()]">{{ req.priority }}</span></td>
              <td><StatusBadge :status="req.status" /></td>
              <td>
                <span class="user-text">{{ req.requesterFirstName }} {{ req.requesterLastName }}</span>
                <span class="dept-subtext">{{ req.requesterDepartmentName || '' }}</span>
              </td>
              <td class="date-col">{{ formatDate(req.createdAt) }}</td>
              <td style="text-align: right;">
                <router-link :to="`/requests/${req.id}`" class="btn-secondary btn-sm">
                  View <i class="pi pi-chevron-right" style="font-size: 0.6875rem;"></i>
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Server-side Pagination -->
        <div class="pagination-bar">
          <span class="pagination-info">
            Showing {{ paginationInfo }} of {{ totalItems }} requests
          </span>
          <div class="pagination-controls">
            <button
              :disabled="page === 1"
              @click="changePage(page - 1)"
              class="page-btn"
            >
              Previous
            </button>
            <span class="current-page">Page {{ page }} of {{ totalPages }}</span>
            <button
              :disabled="page >= totalPages"
              @click="changePage(page + 1)"
              class="page-btn"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import AppLayout from '../../components/layout/AppLayout.vue';
import PageHeader from '../../components/common/PageHeader.vue';
import StatusBadge from '../../components/common/StatusBadge.vue';
import EmptyState from '../../components/common/EmptyState.vue';
import { useAuthStore } from '../../stores/auth.store';
import { requestApi } from '../../api/request.api';
import { ApprovalRequest } from '../../types/request';

const authStore = useAuthStore();
const requests = ref<ApprovalRequest[]>([]);
const loading = ref(true);

const search = ref('');
const statusFilter = ref('');
const typeFilter = ref('');
const page = ref(1);
const pageSize = ref(10);
const totalItems = ref(0);
const totalPages = ref(1);

let debounceTimer: any = null;

function debounceSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    page.value = 1;
    fetchRequests();
  }, 300);
}

const paginationInfo = computed(() => {
  if (totalItems.value === 0) return '0';
  const start = (page.value - 1) * pageSize.value + 1;
  const end = Math.min(page.value * pageSize.value, totalItems.value);
  return `${start}–${end}`;
});

async function fetchRequests() {
  loading.value = true;
  try {
    const res = await requestApi.getAll({
      page: page.value,
      pageSize: pageSize.value,
      search: search.value,
      status: statusFilter.value,
      type: typeFilter.value,
    });
    if (res.success && res.data) {
      requests.value = res.data.items;
      totalItems.value = res.data.pagination.totalItems;
      totalPages.value = res.data.pagination.totalPages;
    }
  } catch (err) {
    console.error('Failed to fetch requests', err);
  } finally {
    loading.value = false;
  }
}

function changePage(newPage: number) {
  page.value = newPage;
  fetchRequests();
}

function formatType(typeStr: string): string {
  return typeStr?.replace(/_/g, ' ') || '';
}

function formatDate(isoStr: string): string {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

onMounted(() => {
  fetchRequests();
});
</script>

<style scoped>
.filter-card {
  background: var(--surface-0);
  padding: 1rem 1.25rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--surface-200);
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 280px;
}

.search-icon {
  position: absolute;
  left: 0.875rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.875rem 0.5rem 2.5rem;
  border: 1px solid var(--surface-300);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  outline: none;
}
.search-input:focus {
  border-color: var(--primary-600);
}

.filter-group {
  display: flex;
  gap: 0.75rem;
}

.filter-select {
  padding: 0.5rem 0.875rem;
  border: 1px solid var(--surface-300);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  background: white;
  outline: none;
}

.table-card {
  background: var(--surface-0);
  border-radius: var(--radius-md);
  border: 1px solid var(--surface-200);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.875rem;
}

.data-table th {
  background: var(--surface-50);
  padding: 0.75rem 1rem;
  font-weight: 600;
  color: var(--text-muted);
  border-bottom: 1px solid var(--surface-200);
  text-transform: uppercase;
  font-size: 0.6875rem;
  letter-spacing: 0.05em;
}

.data-table td {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--surface-200);
  color: var(--text-main);
  vertical-align: middle;
}

.req-number {
  font-family: monospace;
  font-weight: 700;
  color: var(--primary-700);
}

.title-link {
  font-weight: 600;
  color: var(--surface-900);
  text-decoration: none;
}
.title-link:hover {
  color: var(--primary-600);
}

.attempt-badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.125rem 0.375rem;
  background: #fef3c7;
  color: #92400e;
  border-radius: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 700;
}

.type-tag {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
}

.priority-tag {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  text-transform: uppercase;
}
.priority-tag.low { background: #f3f4f6; color: #4b5563; }
.priority-tag.medium { background: #eff6ff; color: #1d4ed8; }
.priority-tag.high { background: #fff7ed; color: #c2410c; }
.priority-tag.urgent { background: #fef2f2; color: #dc2626; }

.user-text {
  display: block;
  font-weight: 500;
}

.dept-subtext {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.date-col {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.btn-sm {
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
}

.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1.25rem;
  background: var(--surface-50);
  border-top: 1px solid var(--surface-200);
}

.pagination-info {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.page-btn {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--surface-300);
  background: white;
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  cursor: pointer;
}
.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.current-page {
  font-size: 0.8125rem;
  font-weight: 600;
}

.loading-box {
  text-align: center;
  padding: 3rem;
  color: var(--text-muted);
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}
</style>
