<template>
  <div class="card auth-card">
    <div style="text-align: center; margin-bottom: 1.5rem;">
      <h2>Approval System</h2>
      <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.25rem;">
        Vue.js Frontend (FastAPI Backend)
      </p>
    </div>

    <div v-if="errorMessage" class="alert alert-danger">
      {{ errorMessage }}
    </div>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label class="form-label" for="vue-email">Email Address</label>
        <input
          id="vue-email"
          type="email"
          class="form-control"
          :class="{ 'is-invalid': emailError }"
          v-model="email"
          @blur="validateEmail"
          placeholder="admin@example.com"
        />
        <div v-if="emailError" class="invalid-feedback">
          Please enter a valid email address.
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="vue-password">Password</label>
        <input
          id="vue-password"
          type="password"
          class="form-control"
          :class="{ 'is-invalid': passwordError }"
          v-model="password"
          @blur="validatePassword"
          placeholder="••••••••"
        />
        <div v-if="passwordError" class="invalid-feedback">
          Password is required.
        </div>
      </div>

      <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
        <span v-if="loading" class="spinner" style="width: 1rem; height: 1rem; margin-right: 0.5rem;"></span>
        {{ loading ? 'Signing in...' : 'Sign In' }}
      </button>
    </form>

    <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
      <p style="font-size: 0.8125rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.5rem;">
        ⚡ Quick Demo Logins:
      </p>
      <div class="demo-btn-group">
        <button type="button" class="btn-demo" @click="useDemo('admin@example.com', 'admin123')">
          Admin Demo
        </button>
        <button type="button" class="btn-demo" @click="useDemo('manager@example.com', 'manager123')">
          Manager Demo
        </button>
        <button type="button" class="btn-demo" @click="useDemo('employee@example.com', 'employee123')">
          Employee Demo
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const { login } = useAuth();

const email = ref('');
const password = ref('');
const emailError = ref(false);
const passwordError = ref(false);
const loading = ref(false);
const errorMessage = ref('');

function validateEmail() {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  emailError.value = !email.value || !emailRegex.test(email.value);
}

function validatePassword() {
  passwordError.value = !password.value;
}

function useDemo(userEmail: string, userPass: string) {
  email.value = userEmail;
  password.value = userPass;
  emailError.value = false;
  passwordError.value = false;
}

async function handleSubmit() {
  validateEmail();
  validatePassword();

  if (emailError.value || passwordError.value) {
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const res = await login({ email: email.value, password: password.value });
    loading.value = false;

    if (res.success) {
      router.push('/approvals');
    } else {
      errorMessage.value = res.message || 'Login failed.';
    }
  } catch (err: any) {
    loading.value = false;
    errorMessage.value = err.response?.data?.message || 'Authentication failed. Please verify FastAPI backend is running.';
  }
}
</script>
