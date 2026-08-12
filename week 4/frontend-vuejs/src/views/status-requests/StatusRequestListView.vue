<template>
  <AppLayout>
    <div class="status-requests-page">
      <PageHeader
        title="Employee Status Change Requests"
        subtitle="Review and approve manager requests for employee activation and deactivation"
      />

      <div class="filter-card">
        <select v-model="statusFilter" @change="fetchStatusRequests" class="filter-select">
          <option value="">All Statuses</option>
          <option value="PENDING">Pending Admin Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <select v-model="typeFilter" @change="fetchStatusRequests" class="filter-select">
          <option value="">All Request Types</option>
          <option value="ACTIVATE_EMPLOYEE">Employee Activation</option>
          <option value="DEACTIVATE_EMPLOYEE">Employee Deactivation</option>
        </select>
      </div>

      <div v-if="loading" class="loading-box">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Loading status requests...</span>
      </div>

      <EmptyState
        v-else-if="statusRequests.length === 0"
        title="No status change requests found"
        message="There are no employee activation or deactivation requests waiting for review."
      />

      <div v-else class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Target Employee</th>
              <th>Department</th>
              <th>Request Type</th>
              <th>Requested By</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Requested Date</th>
              <th style="text-align: right;">Admin Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sr in statusRequests" :key="sr.id">
              <td class="name-col">
                <strong>{{ sr.employeeFirstName }} {{ sr.employeeLastName }}</strong>
                <span class="subtext">{{ sr.employeeNumber }} • Current: {{ sr.employeeCurrentStatus }}</span>
              </td>
              <td>{{ sr.departmentName }} ({{ sr.departmentCode }})</td>
              <td>
                <span :class="['type-badge', sr.requestType]">
                  {{ sr.requestType === 'ACTIVATE_EMPLOYEE' ? 'ACTIVATION' : 'DEACTIVATION' }}
                </span>
              </td>
              <td>
                <span class="user-text">{{ sr.requestedByFirstName }} {{ sr.requestedByLastName }}</span>
                <span class="subtext">Department Manager</span>
              </td>
              <td class="reason-cell">{{ sr.reason || 'No reason provided.' }}</td>
              <td><StatusBadge :status="sr.status" /></td>
              <td class="date-col">{{ formatDate(sr.createdAt) }}</td>

              <td style="text-align: right;">
                <template v-if="sr.status === 'PENDING'">
                  <button @click="openApproveModal(sr)" class="btn-success btn-xs" style="margin-right: 0.25rem;">
                    <i class="pi pi-check"></i> Approve
                  </button>
                  <button @click="openRejectModal(sr)" class="btn-danger btn-xs">
                    <i class="pi pi-times"></i> Reject
                  </button>
                </template>
                <span v-else class="done-text">Completed</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Approve Confirmation Modal -->
      <div v-if="showApproveModal" class="modal-overlay">
        <div class="modal-card">
          <h3>Approve Employee Status Change</h3>
          <p>
            Confirming will set employee
            <strong>{{ selectedReq?.employeeFirstName }} {{ selectedReq?.employeeLastName }}</strong>
            to status <strong>{{ selectedReq?.requestType === 'ACTIVATE_EMPLOYEE' ? 'ACTIVE' : 'INACTIVE' }}</strong>.
          </p>
          <div class="form-group" style="margin-top: 1rem;">
            <label>Approval Comment (Optional)</label>
            <textarea v-model="commentText" rows="3" class="form-control" placeholder="Add approval note..."></textarea>
          </div>
          <div class="modal-actions">
            <button @click="showApproveModal = false" class="btn-secondary">Cancel</button>
            <button @click="confirmApprove" :disabled="submitting" class="btn-success">
              Approve Status Change
            </button>
          </div>
        </div>
      </div>

      <!-- Reject Confirmation Modal -->
      <div v-if="showRejectModal" class="modal-overlay">
        <div class="modal-card">
          <h3>Reject Employee Status Change</h3>
          <p>
            Rejecting will keep employee
            <strong>{{ selectedReq?.employeeFirstName }} {{ selectedReq?.employeeLastName }}</strong>
            in status <strong>{{ selectedReq?.employeeCurrentStatus }}</strong>.
          </p>
          <div class="form-group" style="margin-top: 1rem;">
            <label>Rejection Comment <span class="req">* (Required)</span></label>
            <textarea v-model="commentText" rows="3" class="form-control" placeholder="Provide reason for rejection..."></textarea>
          </div>
          <div v-if="modalError" class="modal-error">{{ modalError }}</div>
          <div class="modal-actions">
            <button @click="showRejectModal = false" class="btn-secondary">Cancel</button>
            <button @click="confirmReject" :disabled="submitting" class="btn-danger">
              Reject Request
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AppLayout from '../../components/layout/AppLayout.vue';
import PageHeader from '../../components/common/PageHeader.vue';
import StatusBadge from '../../components/common/StatusBadge.vue';
import EmptyState from '../../components/common/EmptyState.vue';
import { statusRequestApi } from '../../api/statusRequest.api';
import { EmployeeStatusRequest } from '../../types/statusRequest';

const statusRequests = ref<EmployeeStatusRequest[]>([]);
const loading = ref(true);
const statusFilter = ref('');
const typeFilter = ref('');

const showApproveModal = ref(false);
const showRejectModal = ref(false);
const selectedReq = ref<EmployeeStatusRequest | null>(null);
const commentText = ref('');
const modalError = ref('');
const submitting = ref(false);

async function fetchStatusRequests() {
  loading.value = true;
  try {
    const res = await statusRequestApi.getAll({
      status: statusFilter.value,
      requestType: typeFilter.value,
    });
    if (res.success && res.data) {
      statusRequests.value = res.data.items;
    }
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

function openApproveModal(sr: EmployeeStatusRequest) {
  selectedReq.value = sr;
  commentText.value = '';
  modalError.value = '';
  showApproveModal.value = true;
}

function openRejectModal(sr: EmployeeStatusRequest) {
  selectedReq.value = sr;
  commentText.value = '';
  modalError.value = '';
  showRejectModal.value = true;
}

async function confirmApprove() {
  if (!selectedReq.value) return;
  submitting.value = true;
  try {
    await statusRequestApi.approve(selectedReq.value.id, commentText.value);
    showApproveModal.value = false;
    await fetchStatusRequests();
  } catch (err: any) {
    modalError.value = err.response?.data?.message || 'Error approving request.';
  } finally {
    submitting.value = false;
  }
}

async function confirmReject() {
  if (!selectedReq.value) return;
  if (!commentText.value.trim()) {
    modalError.value = 'Rejection reason is required.';
    return;
  }
  submitting.value = true;
  try {
    await statusRequestApi.reject(selectedReq.value.id, commentText.value);
    showRejectModal.value = false;
    await fetchStatusRequests();
  } catch (err: any) {
    modalError.value = err.response?.data?.message || 'Error rejecting request.';
  } finally {
    submitting.value = false;
  }
}

function formatDate(isoStr?: string) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

onMounted(fetchStatusRequests);
</script>

<style scoped>
.filter-card { background: var(--surface-0); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--surface-200); display: flex; gap: 1rem; margin-bottom: 1.25rem; }
.filter-select { padding: 0.5rem; border: 1px solid var(--surface-300); border-radius: var(--radius-sm); background: white; }

.table-card { background: var(--surface-0); border-radius: var(--radius-md); border: 1px solid var(--surface-200); overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.data-table th { background: var(--surface-50); padding: 0.75rem 1rem; text-transform: uppercase; font-size: 0.6875rem; color: var(--text-muted); border-bottom: 1px solid var(--surface-200); }
.data-table td { padding: 0.875rem 1rem; border-bottom: 1px solid var(--surface-200); }
.subtext { display: block; font-size: 0.75rem; color: var(--text-muted); }
.reason-cell { max-width: 200px; font-size: 0.8125rem; color: var(--text-main); }
.date-col { font-size: 0.8125rem; color: var(--text-muted); }
.done-text { font-size: 0.75rem; color: var(--text-muted); font-style: italic; }

.type-badge { font-size: 0.6875rem; font-weight: 700; padding: 0.125rem 0.375rem; border-radius: 0.25rem; text-transform: uppercase; }
.type-badge.ACTIVATE_EMPLOYEE { background: #dcfce7; color: #15803d; }
.type-badge.DEACTIVATE_EMPLOYEE { background: #fee2e2; color: #b91c1c; }

.btn-xs { padding: 0.25rem 0.5rem; font-size: 0.75rem; border-radius: 0.25rem; border: none; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem; }
.btn-success { background: #16a34a; color: white; }
.btn-danger { background: #dc2626; color: white; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-card { background: white; padding: 1.5rem; border-radius: var(--radius-md); max-width: 480px; width: 100%; }
.modal-error { color: #dc2626; font-size: 0.8125rem; margin-top: 0.5rem; }
.form-group { margin-bottom: 0.875rem; display: flex; flex-direction: column; gap: 0.25rem; }
.form-control { padding: 0.5rem; border: 1px solid var(--surface-300); border-radius: var(--radius-sm); }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.25rem; }
</style>
