<template>
  <header class="topbar">
    <div class="topbar-left">
      <h2 class="page-title">{{ currentTitle }}</h2>
    </div>

    <div class="topbar-right" v-if="authStore.user">
      <div class="user-info-pill">
        <div class="avatar">
          {{ avatarInitials }}
        </div>
        <div class="user-details">
          <span class="user-name">
            {{ authStore.user.firstName }} {{ authStore.user.lastName }}
          </span>
          <span class="user-meta">
            {{ authStore.user.role }} • {{ authStore.user.departmentName || 'System Admin' }}
          </span>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';

const route = useRoute();
const authStore = useAuthStore();

const currentTitle = computed(() => {
  switch (route.name) {
    case 'Dashboard': return 'Dashboard Overview';
    case 'RequestList': return authStore.isEmployee ? 'My Approval Requests' : 'Approval Requests';
    case 'RequestCreate': return 'Create Approval Request';
    case 'RequestDetail': return 'Request Details';
    case 'MyDepartment': return 'My Department Employees';
    case 'EmployeeList': return 'Employee Directory';
    case 'DepartmentList': return 'Department Management';
    case 'ManagerList': return 'Manager Directory';
    case 'StatusRequestList': return 'Employee Status Requests';
    case 'AuditHistory': return 'System Audit Trail';
    default: return 'ApprovalFlow';
  }
});

const avatarInitials = computed(() => {
  if (!authStore.user) return 'U';
  const f = authStore.user.firstName?.[0] || '';
  const l = authStore.user.lastName?.[0] || '';
  return (f + l).toUpperCase() || 'U';
});
</script>

<style scoped>
.page-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--surface-900);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info-pill {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.375rem 0.75rem;
  background: var(--surface-50);
  border: 1px solid var(--surface-200);
  border-radius: 9999px;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--primary-600);
  color: #ffffff;
  font-weight: 700;
  font-size: 0.8125rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--surface-900);
  line-height: 1.2;
}

.user-meta {
  font-size: 0.6875rem;
  color: var(--text-muted);
}
</style>
