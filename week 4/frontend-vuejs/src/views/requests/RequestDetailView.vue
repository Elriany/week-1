<template>
  <AppLayout>
    <div class="request-detail-page">
      <PageHeader
        :title="request ? `${request.requestNumber} — ${request.title}` : 'Request Details'"
        subtitle="Review approval request details, activity timeline, and comments"
      >
        <template #actions>
          <router-link to="/requests" class="btn-secondary">
            <i class="pi pi-arrow-left"></i> Back to Requests
          </router-link>
        </template>
      </PageHeader>

      <div v-if="loading" class="loading-box">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Loading request details...</span>
      </div>

      <div v-else-if="request" class="detail-container">
        <!-- Rejection Reason Callout Banner (if status is REJECTED) -->
        <div v-if="request.status === 'REJECTED'" class="rejection-banner">
          <div class="banner-icon">
            <i class="pi pi-exclamation-triangle"></i>
          </div>
          <div class="banner-body">
            <h4>Request Was Rejected</h4>
            <p v-if="latestRejectionComment" class="rejection-reason">
              <strong>Reason:</strong> "{{ latestRejectionComment }}"
            </p>
            <p v-else class="rejection-reason">
              <strong>Reason:</strong> No explicit rejection comment recorded.
            </p>
            <div class="resubmit-prompt" v-if="isRequester">
              <span>You can resubmit this request with additional details or business justification. Previous rejection history will be preserved.</span>
              <button @click="openResubmitModal" class="btn-primary btn-sm" style="margin-top: 0.5rem;">
                <i class="pi pi-refresh"></i> Resubmit Request (Attempt #{{ request.attempt + 1 }})
              </button>
            </div>
          </div>
        </div>

        <!-- Main Card Header & Actions -->
        <div class="card-panel">
          <div class="panel-top">
            <div class="panel-tags">
              <StatusBadge :status="request.status" />
              <span class="type-chip">{{ formatType(request.type) }}</span>
              <span :class="['priority-chip', request.priority.toLowerCase()]">{{ request.priority }} PRIORITY</span>
              <span v-if="request.attempt > 1" class="attempt-chip">Attempt #{{ request.attempt }}</span>
            </div>

            <!-- Action Buttons for Reviewer / Requester -->
            <div class="action-btn-group">
              <!-- Submit Draft -->
              <button
                v-if="request.status === 'DRAFT' && isRequester"
                @click="handleSubmitDraft"
                class="btn-primary"
              >
                <i class="pi pi-send"></i> Submit Request
              </button>

              <!-- Cancel Request -->
              <button
                v-if="(request.status === 'DRAFT' || request.status.startsWith('PENDING')) && isRequester"
                @click="handleCancel"
                class="btn-secondary"
              >
                <i class="pi pi-ban"></i> Cancel Request
              </button>

              <!-- Approve / Reject for Authorized Reviewers -->
              <template v-if="canReview">
                <button @click="openApproveModal" class="btn-success">
                  <i class="pi pi-check-circle"></i> Approve Request
                </button>
                <button @click="openRejectModal" class="btn-danger">
                  <i class="pi pi-times-circle"></i> Reject Request
                </button>
              </template>

              <!-- Resubmit for Requester if Rejected -->
              <button
                v-if="request.status === 'REJECTED' && isRequester"
                @click="openResubmitModal"
                class="btn-primary"
              >
                <i class="pi pi-refresh"></i> Resubmit Request
              </button>
            </div>
          </div>

          <!-- Metadata Fields -->
          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Requester</span>
              <span class="meta-value">{{ request.requesterFirstName }} {{ request.requesterLastName }}</span>
              <span class="meta-sub">{{ request.requesterRole }} • {{ request.requesterDepartmentName || 'N/A' }}</span>
            </div>

            <div class="meta-item" v-if="request.reviewerFirstName">
              <span class="meta-label">Reviewer</span>
              <span class="meta-value">{{ request.reviewerFirstName }} {{ request.reviewerLastName }}</span>
            </div>

            <div class="meta-item" v-if="request.targetFirstName">
              <span class="meta-label">Target Employee</span>
              <span class="meta-value">{{ request.targetFirstName }} {{ request.targetLastName }} ({{ request.targetEmployeeNumber }})</span>
            </div>

            <div class="meta-item">
              <span class="meta-label">Created Date</span>
              <span class="meta-value">{{ formatDate(request.createdAt) }}</span>
            </div>

            <div class="meta-item" v-if="request.dueDate">
              <span class="meta-label">Required Due Date</span>
              <span class="meta-value">{{ formatDate(request.dueDate) }}</span>
            </div>
          </div>

          <!-- Description -->
          <div class="description-section">
            <h4>Description & Business Justification</h4>
            <p class="description-text">{{ request.description || 'No detailed description provided.' }}</p>
          </div>
        </div>

        <!-- 2 Column Layout: Timeline & Comments -->
        <div class="columns-grid">
          <!-- Column 1: Approval History Timeline -->
          <div class="card-panel">
            <h3><i class="pi pi-history" style="margin-right: 0.5rem; color: #4f46e5;"></i> Workflow Audit Trail</h3>
            <ActivityTimeline :items="history" />
          </div>

          <!-- Column 2: Activity Comments -->
          <div class="card-panel">
            <h3><i class="pi pi-comments" style="margin-right: 0.5rem; color: #4f46e5;"></i> Discussion & Notes</h3>

            <!-- Add Comment Form -->
            <div class="add-comment-box">
              <textarea
                v-model="newComment"
                rows="3"
                placeholder="Add a comment or note..."
                class="comment-input"
              ></textarea>
              <button
                @click="handleAddComment"
                :disabled="!newComment.trim() || submittingComment"
                class="btn-primary btn-sm"
                style="margin-top: 0.5rem; align-self: flex-end;"
              >
                <i class="pi pi-send"></i> Post Comment
              </button>
            </div>

            <!-- Comment List -->
            <div class="comments-list">
              <div v-if="comments.length === 0" class="no-comments">
                No comments posted yet.
              </div>
              <div v-for="c in comments" :key="c.id" class="comment-item">
                <div class="comment-header">
                  <span class="author-name">{{ c.authorFirstName }} {{ c.authorLastName }}</span>
                  <span class="author-role">({{ c.authorRole }})</span>
                  <span class="comment-date">{{ formatDate(c.createdAt) }}</span>
                </div>
                <div class="comment-body">{{ c.comment }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Approve Dialog Modal -->
      <div v-if="showApproveModal" class="modal-overlay">
        <div class="modal-card">
          <h3>Approve Request</h3>
          <p>Are you sure you want to approve request <strong>{{ request?.requestNumber }}</strong>?</p>
          <div class="form-group" style="margin-top: 1rem;">
            <label>Optional Approval Note</label>
            <textarea v-model="approvalComment" rows="3" class="form-control" placeholder="Add approval instructions or note..."></textarea>
          </div>
          <div class="modal-actions">
            <button @click="showApproveModal = false" class="btn-secondary">Cancel</button>
            <button @click="confirmApprove" :disabled="submittingAction" class="btn-success">
              Confirm Approval
            </button>
          </div>
        </div>
      </div>

      <!-- Reject Dialog Modal -->
      <div v-if="showRejectModal" class="modal-overlay">
        <div class="modal-card">
          <h3>Reject Request</h3>
          <p>Please state the reason for rejecting request <strong>{{ request?.requestNumber }}</strong>.</p>
          <div class="form-group" style="margin-top: 1rem;">
            <label>Rejection Reason <span class="req">* (Required)</span></label>
            <textarea v-model="rejectionComment" rows="3" class="form-control" placeholder="Provide clear reason for rejection..."></textarea>
          </div>
          <div v-if="modalError" class="modal-error">{{ modalError }}</div>
          <div class="modal-actions">
            <button @click="showRejectModal = false" class="btn-secondary">Cancel</button>
            <button @click="confirmReject" :disabled="submittingAction" class="btn-danger">
              Confirm Rejection
            </button>
          </div>
        </div>
      </div>

      <!-- Resubmit Dialog Modal -->
      <div v-if="showResubmitModal" class="modal-overlay">
        <div class="modal-card">
          <h3>Resubmit Request (Attempt #{{ (request?.attempt || 1) + 1 }})</h3>
          <p>Provide updated justification or details to address the previous rejection.</p>
          <div class="form-group" style="margin-top: 1rem;">
            <label>Resubmission Note / Additional Justification</label>
            <textarea v-model="resubmitComment" rows="4" class="form-control" placeholder="Explain what changes or extra details were added..."></textarea>
          </div>
          <div class="modal-actions">
            <button @click="showResubmitModal = false" class="btn-secondary">Cancel</button>
            <button @click="confirmResubmit" :disabled="submittingAction" class="btn-primary">
              Confirm Resubmission
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import AppLayout from '../../components/layout/AppLayout.vue';
import PageHeader from '../../components/common/PageHeader.vue';
import StatusBadge from '../../components/common/StatusBadge.vue';
import ActivityTimeline from '../../components/common/ActivityTimeline.vue';
import { useAuthStore } from '../../stores/auth.store';
import { requestApi } from '../../api/request.api';
import { ApprovalRequest } from '../../types/request';
import { ApprovalComment } from '../../types/comment';
import { ApprovalHistory } from '../../types/history';

const route = useRoute();
const authStore = useAuthStore();

const request = ref<ApprovalRequest | null>(null);
const comments = ref<ApprovalComment[]>([]);
const history = ref<ApprovalHistory[]>([]);
const loading = ref(true);

const newComment = ref('');
const submittingComment = ref(false);

const showApproveModal = ref(false);
const showRejectModal = ref(false);
const showResubmitModal = ref(false);
const approvalComment = ref('');
const rejectionComment = ref('');
const resubmitComment = ref('');
const modalError = ref('');
const submittingAction = ref(false);

const requestId = computed(() => parseInt(route.params.id as string));

const isRequester = computed(() => request.value?.requesterId === authStore.user?.id);

const canReview = computed(() => {
  if (!request.value || isRequester.value) return false;
  const status = request.value.status;

  if (authStore.isAdmin && (status === 'PENDING_ADMIN' || status === 'PENDING_MANAGER')) {
    return true;
  }
  if (authStore.isManager && status === 'PENDING_MANAGER') {
    return request.value.requesterDepartmentName === authStore.user?.departmentName;
  }
  return false;
});

const latestRejectionComment = computed(() => {
  const rejHistory = [...history.value].reverse().find((h) => h.action === 'REJECTED' && h.comment);
  return rejHistory?.comment || '';
});

async function loadData() {
  loading.value = true;
  try {
    const id = requestId.value;
    const [reqRes, comRes, hisRes] = await Promise.all([
      requestApi.getById(id),
      requestApi.getComments(id),
      requestApi.getHistory(id),
    ]);

    if (reqRes.success && reqRes.data) request.value = reqRes.data;
    if (comRes.success && comRes.data) comments.value = comRes.data;
    if (hisRes.success && hisRes.data) history.value = hisRes.data;
  } catch (err) {
    console.error('Failed to load request details', err);
  } finally {
    loading.value = false;
  }
}

async function handleSubmitDraft() {
  try {
    await requestApi.submit(requestId.value);
    await loadData();
  } catch (err) {
    console.error(err);
  }
}

async function handleCancel() {
  try {
    await requestApi.cancel(requestId.value);
    await loadData();
  } catch (err) {
    console.error(err);
  }
}

function openApproveModal() {
  approvalComment.value = '';
  showApproveModal.value = true;
}

async function confirmApprove() {
  submittingAction.value = true;
  try {
    await requestApi.approve(requestId.value, approvalComment.value);
    showApproveModal.value = false;
    await loadData();
  } catch (err) {
    console.error(err);
  } finally {
    submittingAction.value = false;
  }
}

function openRejectModal() {
  rejectionComment.value = '';
  modalError.value = '';
  showRejectModal.value = true;
}

async function confirmReject() {
  if (!rejectionComment.value.trim()) {
    modalError.value = 'Rejection reason is required.';
    return;
  }
  submittingAction.value = true;
  try {
    await requestApi.reject(requestId.value, rejectionComment.value);
    showRejectModal.value = false;
    await loadData();
  } catch (err: any) {
    modalError.value = err.response?.data?.message || 'Error rejecting request.';
  } finally {
    submittingAction.value = false;
  }
}

function openResubmitModal() {
  resubmitComment.value = '';
  showResubmitModal.value = true;
}

async function confirmResubmit() {
  submittingAction.value = true;
  try {
    await requestApi.resubmit(requestId.value, resubmitComment.value);
    showResubmitModal.value = false;
    await loadData();
  } catch (err) {
    console.error(err);
  } finally {
    submittingAction.value = false;
  }
}

async function handleAddComment() {
  if (!newComment.value.trim()) return;
  submittingComment.value = true;
  try {
    await requestApi.addComment(requestId.value, newComment.value);
    newComment.value = '';
    await loadData();
  } catch (err) {
    console.error(err);
  } finally {
    submittingComment.value = false;
  }
}

function formatType(tStr?: string) { return tStr?.replace(/_/g, ' ') || ''; }

function formatDate(isoStr?: string) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.loading-box {
  text-align: center;
  padding: 3rem;
  color: var(--text-muted);
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.rejection-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  display: flex;
  gap: 1rem;
}

.banner-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fee2e2;
  color: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.banner-body h4 {
  font-size: 1rem;
  color: #991b1b;
  font-weight: 700;
}

.rejection-reason {
  font-size: 0.875rem;
  color: #7f1d1d;
  margin-top: 0.25rem;
}

.resubmit-prompt {
  font-size: 0.8125rem;
  color: #b91c1c;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed #fca5a5;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.panel-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--surface-200);
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.panel-tags {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.type-chip {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.625rem;
  background: var(--surface-200);
  border-radius: 9999px;
}

.priority-chip {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}
.priority-chip.low { background: #f3f4f6; color: #374151; }
.priority-chip.medium { background: #eff6ff; color: #1d4ed8; }
.priority-chip.high { background: #fff7ed; color: #c2410c; }
.priority-chip.urgent { background: #fef2f2; color: #dc2626; }

.attempt-chip {
  font-size: 0.6875rem;
  font-weight: 700;
  background: #fef3c7;
  color: #92400e;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.action-btn-group {
  display: flex;
  gap: 0.5rem;
}

.btn-success {
  background-color: #16a34a;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm);
  border: none;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.meta-item {
  display: flex;
  flex-direction: column;
}

.meta-label {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
}

.meta-value {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--surface-900);
  margin-top: 0.125rem;
}

.meta-sub {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.description-section {
  padding-top: 1.25rem;
  border-top: 1px solid var(--surface-200);
}

.description-section h4 {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--surface-900);
  margin-bottom: 0.5rem;
}

.description-text {
  font-size: 0.875rem;
  color: var(--text-main);
  line-height: 1.6;
  white-space: pre-line;
}

.columns-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.add-comment-box {
  display: flex;
  flex-direction: column;
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--surface-200);
}

.comment-input {
  width: 100%;
  padding: 0.625rem;
  border: 1px solid var(--surface-300);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-family: inherit;
  outline: none;
}
.comment-input:focus { border-color: var(--primary-600); }

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.no-comments {
  color: var(--text-muted);
  font-size: 0.875rem;
  text-align: center;
  padding: 1.5rem;
}

.comment-item {
  background: var(--surface-50);
  border: 1px solid var(--surface-200);
  border-radius: var(--radius-sm);
  padding: 0.75rem 1rem;
}

.comment-header {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
}

.author-name { font-weight: 700; color: var(--surface-900); }
.author-role { margin-left: 0.25rem; }
.comment-date { float: right; }

.comment-body {
  font-size: 0.875rem;
  color: var(--text-main);
}

/* Modals */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-card {
  background: white;
  padding: 1.5rem;
  border-radius: var(--radius-md);
  max-width: 480px;
  width: 100%;
  box-shadow: var(--shadow-lg);
}

.modal-card h3 {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.modal-error {
  color: #dc2626;
  font-size: 0.8125rem;
  margin-top: 0.5rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}
</style>
