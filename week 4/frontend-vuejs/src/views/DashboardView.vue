<template>
  <AppLayout>
    <div class="dashboard-page">
      <PageHeader
        :title="`Welcome back, ${authStore.user?.firstName}!`"
        :subtitle="`Role: ${authStore.role} • Department: ${authStore.user?.departmentName || 'N/A'}`"
      >
        <template #actions>
          <router-link
            v-if="authStore.isEmployee || authStore.isManager"
            to="/requests/create"
            class="btn-primary"
          >
            <i class="pi pi-plus"></i>
            <span>New Approval Request</span>
          </router-link>
        </template>
      </PageHeader>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner spinner-icon"></i>
        <span>Loading dashboard counters...</span>
      </div>

      <template v-else-if="dashboardData">
        <!-- KPI Cards Grid -->
        <div class="kpi-grid">
          <!-- Employee KPIs -->
          <template v-if="authStore.isEmployee">
            <KpiCard title="Total Requests" :value="dashboardData.stats.totalRequests || 0" icon="pi-paperclip" variant="primary" />
            <KpiCard title="Pending Review" :value="dashboardData.stats.pendingRequests || 0" icon="pi-clock" variant="warning" />
            <KpiCard title="Approved" :value="dashboardData.stats.approvedRequests || 0" icon="pi-check-circle" variant="success" />
            <KpiCard title="Rejected" :value="dashboardData.stats.rejectedRequests || 0" icon="pi-times-circle" variant="danger" />
          </template>

          <!-- Manager KPIs -->
          <template v-else-if="authStore.isManager">
            <KpiCard title="Dept Employees" :value="dashboardData.stats.departmentEmployees || 0" icon="pi-users" variant="info" />
            <KpiCard title="Pending Reviews" :value="dashboardData.stats.pendingReviews || 0" icon="pi-exclamation-circle" variant="warning" />
            <KpiCard title="My Requests" :value="dashboardData.stats.myRequests || 0" icon="pi-send" variant="primary" />
            <KpiCard title="Status Requests" :value="dashboardData.stats.pendingStatusRequests || 0" icon="pi-shield" variant="danger" />
          </template>

          <!-- Admin KPIs -->
          <template v-else-if="authStore.isAdmin">
            <KpiCard title="Departments" :value="dashboardData.stats.departmentCount || 0" icon="pi-building" variant="primary" />
            <KpiCard title="Managers" :value="dashboardData.stats.managerCount || 0" icon="pi-user-edit" variant="info" />
            <KpiCard title="Employees" :value="dashboardData.stats.employeeCount || 0" icon="pi-users" variant="success" />
            <KpiCard title="Pending Approvals" :value="dashboardData.stats.pendingApprovals || 0" icon="pi-clock" variant="warning" />
            <KpiCard title="Pending Status Req" :value="dashboardData.stats.pendingStatusRequests || 0" icon="pi-shield" variant="danger" />
          </template>
        </div>

        <!-- Recent Activity Section -->
        <div class="card-panel" style="margin-top: 1.5rem;">
          <div class="card-header">
            <h3><i class="pi pi-history" style="margin-right: 0.5rem; color: #4f46e5;"></i> Recent Activity</h3>
            <router-link to="/requests" class="link-btn">View All Requests →</router-link>
          </div>
          <ActivityTimeline :items="dashboardData.recentActivity" />
        </div>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AppLayout from '../components/layout/AppLayout.vue';
import PageHeader from '../components/common/PageHeader.vue';
import KpiCard from '../components/common/KpiCard.vue';
import ActivityTimeline from '../components/common/ActivityTimeline.vue';
import { useAuthStore } from '../stores/auth.store';
import { dashboardApi } from '../api/dashboard.api';
import { DashboardData } from '../types/dashboard';

const authStore = useAuthStore();
const loading = ref(true);
const dashboardData = ref<DashboardData | null>(null);

onMounted(async () => {
  try {
    const res = await dashboardApi.getDashboard();
    if (res.success && res.data) {
      dashboardData.value = res.data;
    }
  } catch (err) {
    console.error('Failed to load dashboard', err);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--surface-200);
}

.card-header h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--surface-900);
  display: flex;
  align-items: center;
}

.link-btn {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--primary-600);
  text-decoration: none;
}
.link-btn:hover {
  text-decoration: underline;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 4rem;
  color: var(--text-muted);
}

.spinner-icon {
  font-size: 1.5rem;
  color: var(--primary-600);
}
</style>
