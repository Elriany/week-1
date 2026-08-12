<template>
  <aside class="sidebar">
    <!-- Brand Logo / Header -->
    <div class="sidebar-header">
      <div class="brand-logo">
        <i class="pi pi-check-square brand-icon"></i>
        <span class="brand-name">ApprovalFlow</span>
      </div>
      <p class="brand-subtitle">Enterprise Approvals</p>
    </div>

    <!-- Role Badge in Navigation -->
    <div class="role-card" v-if="authStore.user">
      <span class="role-badge" :class="authStore.role?.toLowerCase()">
        {{ authStore.role }}
      </span>
      <div class="dept-text" v-if="authStore.user.departmentName">
        {{ authStore.user.departmentName }}
      </div>
    </div>

    <!-- Navigation Menu -->
    <nav class="sidebar-nav">
      <router-link to="/dashboard" class="nav-item" active-class="active">
        <i class="pi pi-th-large"></i>
        <span>Dashboard</span>
      </router-link>

      <router-link to="/requests" class="nav-item" active-class="active">
        <i class="pi pi-list"></i>
        <span>{{ authStore.isEmployee ? 'My Requests' : 'Requests' }}</span>
      </router-link>

      <router-link
        v-if="authStore.isEmployee || authStore.isManager"
        to="/requests/create"
        class="nav-item"
        active-class="active"
      >
        <i class="pi pi-plus-circle"></i>
        <span>New Request</span>
      </router-link>

      <!-- Manager Specific -->
      <router-link
        v-if="authStore.isManager"
        to="/department"
        class="nav-item"
        active-class="active"
      >
        <i class="pi pi-users"></i>
        <span>My Department</span>
      </router-link>

      <!-- Admin Specific -->
      <template v-if="authStore.isAdmin">
        <div class="nav-section-title">ADMINISTRATION</div>

        <router-link to="/departments" class="nav-item" active-class="active">
          <i class="pi pi-building"></i>
          <span>Departments</span>
        </router-link>

        <router-link to="/managers" class="nav-item" active-class="active">
          <i class="pi pi-user-edit"></i>
          <span>Managers</span>
        </router-link>

        <router-link to="/employees" class="nav-item" active-class="active">
          <i class="pi pi-users"></i>
          <span>Employees</span>
        </router-link>

        <router-link to="/status-requests" class="nav-item" active-class="active">
          <i class="pi pi-shield"></i>
          <span>Status Requests</span>
        </router-link>

        <router-link to="/audit" class="nav-item" active-class="active">
          <i class="pi pi-history"></i>
          <span>Audit Trail</span>
        </router-link>
      </template>
    </nav>

    <!-- Logout Footer -->
    <div class="sidebar-footer">
      <button @click="handleLogout" class="logout-btn">
        <i class="pi pi-sign-out"></i>
        <span>Sign Out</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';

const router = useRouter();
const authStore = useAuthStore();

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.sidebar-header {
  padding: 1.5rem 1.25rem 1rem;
  border-bottom: 1px solid #2d3748;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-icon {
  font-size: 1.5rem;
  color: #6366f1;
}

.brand-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.02em;
}

.brand-subtitle {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 0.25rem;
}

.role-card {
  padding: 0.875rem 1.25rem;
  background: rgba(255, 255, 255, 0.05);
  margin: 1rem 1rem 0.5rem;
  border-radius: 0.5rem;
}

.role-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
}
.role-badge.admin { background: #fee2e2; color: #991b1b; }
.role-badge.manager { background: #dbeafe; color: #1e40af; }
.role-badge.employee { background: #dcfce7; color: #166534; }

.dept-text {
  font-size: 0.75rem;
  color: #cbd5e1;
  margin-top: 0.25rem;
  font-weight: 500;
}

.sidebar-nav {
  flex: 1;
  padding: 0.75rem 0.75rem;
  overflow-y: auto;
}

.nav-section-title {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #64748b;
  padding: 1.25rem 0.75rem 0.5rem;
  letter-spacing: 0.05em;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  color: #94a3b8;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  margin-bottom: 0.25rem;
  transition: all 0.15s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.nav-item.active {
  background: #4f46e5;
  color: #ffffff;
  font-weight: 600;
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid #2d3748;
}

.logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem;
  background: transparent;
  border: none;
  color: #f87171;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background 0.2s;
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.15);
}
</style>
