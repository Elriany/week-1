<template>
  <div class="login-wrapper">
    <div class="login-card">
      <div class="login-header">
        <div class="brand">
          <i class="pi pi-check-square brand-icon"></i>
          <h1>ApprovalFlow</h1>
        </div>
        <p class="subtitle">Simple approvals. Clear decisions.</p>
      </div>

      <div v-if="errorMsg" class="error-banner">
        <i class="pi pi-exclamation-circle"></i>
        <span>{{ errorMsg }}</span>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email">Email Address</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            placeholder="admin@approval.local"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            placeholder="••••••••"
            class="form-input"
          />
        </div>

        <button type="submit" :disabled="loading" class="btn-primary btn-block">
          <i v-if="loading" class="pi pi-spin pi-spinner"></i>
          <span>{{ loading ? 'Signing In...' : 'Sign In' }}</span>
        </button>
      </form>

      <!-- Quick Demo Logins Section -->
      <div class="demo-section">
        <div class="demo-title">⚡ QUICK DEMO LOGINS</div>
        <p class="demo-subtitle">Select a role to populate credentials (click Sign In afterward):</p>
        <div class="demo-buttons">
          <button
            type="button"
            class="demo-btn admin"
            @click="populateDemo('admin@approval.local', 'Password123!')"
          >
            <i class="pi pi-shield"></i> Admin Demo
          </button>
          <button
            type="button"
            class="demo-btn manager"
            @click="populateDemo('manager.it@approval.local', 'Password123!')"
          >
            <i class="pi pi-user-edit"></i> Manager Demo
          </button>
          <button
            type="button"
            class="demo-btn employee"
            @click="populateDemo('employee.it1@approval.local', 'Password123!')"
          >
            <i class="pi pi-user"></i> Employee Demo
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');

function populateDemo(demoEmail: string, demoPass: string) {
  email.value = demoEmail;
  password.value = demoPass;
  errorMsg.value = '';
}

async function handleLogin() {
  if (!email.value || !password.value) return;

  loading.value = true;
  errorMsg.value = '';

  try {
    const res = await authStore.login(email.value, password.value);
    if (res.success) {
      router.push('/dashboard');
    } else {
      errorMsg.value = res.message || 'Login failed.';
    }
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || 'Failed to connect to backend service. Please check Node.js API server.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
  padding: 1.5rem;
}

.login-card {
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  border-radius: 0.75rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: 2.5rem;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.brand-icon {
  font-size: 2rem;
  color: #4f46e5;
}

.brand h1 {
  font-size: 1.75rem;
  font-weight: 800;
  color: #1e1b4b;
  letter-spacing: -0.03em;
}

.subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.375rem;
}

.error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-group label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
}

.form-input {
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.btn-block {
  width: 100%;
  justify-content: center;
  padding: 0.75rem;
  font-size: 0.9375rem;
  margin-top: 0.5rem;
}

.demo-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.demo-title {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #6b7280;
  letter-spacing: 0.05em;
}

.demo-subtitle {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 0.25rem;
  margin-bottom: 0.875rem;
}

.demo-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.demo-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: 0.375rem;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.15s ease;
}

.demo-btn.admin {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}
.demo-btn.admin:hover { background: #fee2e2; }

.demo-btn.manager {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1e40af;
}
.demo-btn.manager:hover { background: #dbeafe; }

.demo-btn.employee {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #166534;
}
.demo-btn.employee:hover { background: #dcfce7; }
</style>
