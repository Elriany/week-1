<template>
  <div class="container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Approval Requests</h1>
        <p style="color: var(--text-muted); font-size: 0.875rem;">
          Manage and view organizational request workflows
        </p>
      </div>
      <router-link to="/approvals/create" class="btn btn-primary">
        + New Approval
      </router-link>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="card state-container">
      <div class="spinner"></div>
      <p style="margin-top: 1rem; color: var(--text-muted);">Loading approval requests...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" class="card state-container">
      <div class="alert alert-danger" style="display: inline-block;">
        {{ errorMessage }}
      </div>
      <div>
        <button class="btn btn-secondary" @click="fetchApprovals">Retry</button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="approvals.length === 0" class="card state-container">
      <h3>No approval requests found</h3>
      <p style="color: var(--text-muted); margin-top: 0.5rem; margin-bottom: 1.5rem;">
        Get started by creating your first approval request.
      </p>
      <router-link to="/approvals/create" class="btn btn-primary">+ New Approval</router-link>
    </div>

    <!-- Approvals Table -->
    <div v-else class="table-responsive">
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
          <tr v-for="item in approvals" :key="item.id">
            <td><code>{{ item.id }}</code></td>
            <td style="font-weight: 600;">{{ item.title }}</td>
            <td>{{ item.description }}</td>
            <td>{{ item.requesterId }}</td>
            <td>
              <ApprovalStatusBadge :status="item.status" />
            </td>
            <td>{{ formatDate(item.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { approvalService } from '../services/approval.service';
import { Approval } from '../types/approval';
import ApprovalStatusBadge from '../components/ApprovalStatusBadge.vue';

const approvals = ref<Approval[]>([]);
const loading = ref(true);
const errorMessage = ref('');

function formatDate(isoStr: string): string {
  if (!isoStr) return 'N/A';
  return new Date(isoStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

async function fetchApprovals() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const res = await approvalService.getApprovals();
    loading.value = false;

    if (res.success && res.data) {
      approvals.value = res.data.approvals || [];
    } else {
      errorMessage.value = res.message || 'Unable to load approval requests.';
    }
  } catch (err: any) {
    loading.value = false;
    errorMessage.value = err.response?.data?.message || 'Unable to load approval requests. Check FastAPI backend status.';
  }
}

onMounted(() => {
  fetchApprovals();
});
</script>
