<template>
  <AppLayout>
    <div class="audit-page">
      <PageHeader
        title="System Audit Trail"
        subtitle="Immutable audit log of all organizational approval workflow events and status changes"
      />

      <div class="filter-card">
        <div class="search-box">
          <i class="pi pi-search search-icon"></i>
          <input
            v-model="search"
            @input="debounceSearch"
            type="text"
            placeholder="Search audit trail by request number or title..."
            class="search-input"
          />
        </div>
        <select v-model="actionFilter" @change="fetchAuditHistory" class="filter-select">
          <option value="">All Action Types</option>
          <option value="REQUEST_CREATED">REQUEST_CREATED</option>
          <option value="SUBMITTED">SUBMITTED</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="RESUBMITTED">RESUBMITTED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="ACTIVATION_REQUESTED">ACTIVATION_REQUESTED</option>
          <option value="ACTIVATION_APPROVED">ACTIVATION_APPROVED</option>
          <option value="ACTIVATION_REJECTED">ACTIVATION_REJECTED</option>
          <option value="DEACTIVATION_REQUESTED">DEACTIVATION_REQUESTED</option>
          <option value="DEACTIVATION_REJECTED">DEACTIVATION_REJECTED</option>
        </select>
      </div>

      <div v-if="loading" class="loading-box">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Loading audit trail...</span>
      </div>

      <div v-else class="card-panel">
        <ActivityTimeline :items="historyItems" />

        <div class="pagination-bar" v-if="historyItems.length > 0">
          <span class="pagination-info">Showing {{ historyItems.length }} of {{ totalItems }} records</span>
          <div class="pagination-controls">
            <button :disabled="page === 1" @click="changePage(page - 1)" class="page-btn">Previous</button>
            <span class="current-page">Page {{ page }} of {{ totalPages }}</span>
            <button :disabled="page >= totalPages" @click="changePage(page + 1)" class="page-btn">Next</button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AppLayout from '../components/layout/AppLayout.vue';
import PageHeader from '../components/common/PageHeader.vue';
import ActivityTimeline from '../components/common/ActivityTimeline.vue';
import { historyApi } from '../api/history.api';
import { ApprovalHistory } from '../types/history';

const historyItems = ref<ApprovalHistory[]>([]);
const loading = ref(true);
const search = ref('');
const actionFilter = ref('');
const page = ref(1);
const pageSize = ref(20);
const totalItems = ref(0);
const totalPages = ref(1);

let debounceTimer: any = null;
function debounceSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    page.value = 1;
    fetchAuditHistory();
  }, 300);
}

async function fetchAuditHistory() {
  loading.value = true;
  try {
    const res = await historyApi.getAll({
      page: page.value,
      pageSize: pageSize.value,
      search: search.value,
      action: actionFilter.value,
    });
    if (res.success && res.data) {
      historyItems.value = res.data.items;
      totalItems.value = res.data.pagination.totalItems;
      totalPages.value = res.data.pagination.totalPages;
    }
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

function changePage(newPage: number) {
  page.value = newPage;
  fetchAuditHistory();
}

onMounted(fetchAuditHistory);
</script>

<style scoped>
.filter-card { background: var(--surface-0); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--surface-200); display: flex; gap: 1rem; margin-bottom: 1.25rem; }
.search-box { position: relative; flex: 1; }
.search-icon { position: absolute; left: 0.875rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
.search-input { width: 100%; padding: 0.5rem 0.875rem 0.5rem 2.5rem; border: 1px solid var(--surface-300); border-radius: var(--radius-sm); outline: none; }
.filter-select { padding: 0.5rem; border: 1px solid var(--surface-300); border-radius: var(--radius-sm); background: white; }

.pagination-bar { display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid var(--surface-200); margin-top: 1rem; }
.pagination-info { font-size: 0.8125rem; color: var(--text-muted); }
.pagination-controls { display: flex; align-items: center; gap: 0.75rem; }
.page-btn { padding: 0.375rem 0.75rem; border: 1px solid var(--surface-300); background: white; border-radius: var(--radius-sm); font-size: 0.8125rem; cursor: pointer; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.current-page { font-size: 0.8125rem; font-weight: 600; }
</style>
