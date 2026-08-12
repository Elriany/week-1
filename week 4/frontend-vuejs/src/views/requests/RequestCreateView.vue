<template>
  <AppLayout>
    <div class="request-create-page">
      <PageHeader
        title="Create Approval Request"
        subtitle="Submit a new business request for manager or admin approval"
      >
        <template #actions>
          <router-link to="/requests" class="btn-secondary">
            <i class="pi pi-arrow-left"></i> Back to Requests
          </router-link>
        </template>
      </PageHeader>

      <div class="card-panel form-card">
        <form @submit.prevent="handleSubmit">
          <div v-if="errorMsg" class="error-alert">
            <i class="pi pi-exclamation-triangle"></i>
            <span>{{ errorMsg }}</span>
          </div>

          <div class="form-group">
            <label for="title">Request Title <span class="req">*</span></label>
            <input
              id="title"
              v-model="title"
              type="text"
              required
              placeholder="e.g. Upgrade Development Laptop to 32GB RAM"
              class="form-control"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="type">Request Type</label>
              <select id="type" v-model="type" class="form-control" :disabled="authStore.isEmployee">
                <option value="GENERAL_APPROVAL">General Approval</option>
                <option value="MANAGER_REQUEST" v-if="authStore.isManager">Manager Request</option>
              </select>
              <small class="help-text" v-if="authStore.isEmployee">
                Employees can submit General Approval requests to their Department Manager.
              </small>
            </div>

            <div class="form-group">
              <label for="priority">Priority</label>
              <select id="priority" v-model="priority" class="form-control">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="dueDate">Required Due Date (Optional)</label>
            <input id="dueDate" v-model="dueDate" type="date" class="form-control" />
          </div>

          <div class="form-group">
            <label for="description">Detailed Description / Justification</label>
            <textarea
              id="description"
              v-model="description"
              rows="5"
              placeholder="Provide business reason, cost estimate, or project context for this request..."
              class="form-control"
            ></textarea>
          </div>

          <div class="form-actions">
            <button type="button" @click="handleSaveDraft" :disabled="submitting" class="btn-secondary">
              <i class="pi pi-save"></i> Save as Draft
            </button>
            <button type="submit" :disabled="submitting" class="btn-primary">
              <i v-if="submitting" class="pi pi-spin pi-spinner"></i>
              <i v-else class="pi pi-send"></i>
              <span>Submit for Approval</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '../../components/layout/AppLayout.vue';
import PageHeader from '../../components/common/PageHeader.vue';
import { useAuthStore } from '../../stores/auth.store';
import { requestApi } from '../../api/request.api';

const router = useRouter();
const authStore = useAuthStore();

const title = ref('');
const description = ref('');
const type = ref(authStore.isManager ? 'MANAGER_REQUEST' : 'GENERAL_APPROVAL');
const priority = ref('MEDIUM');
const dueDate = ref('');
const submitting = ref(false);
const errorMsg = ref('');

async function handleSaveDraft() {
  if (!title.value) {
    errorMsg.value = 'Please provide a title for the request.';
    return;
  }
  await createRequest(true);
}

async function handleSubmit() {
  if (!title.value) {
    errorMsg.value = 'Please provide a title for the request.';
    return;
  }
  await createRequest(false);
}

async function createRequest(isDraft: boolean) {
  submitting.value = true;
  errorMsg.value = '';

  try {
    const res = await requestApi.create({
      title: title.value,
      description: description.value,
      type: type.value as any,
      priority: priority.value as any,
      dueDate: dueDate.value || undefined,
    });

    if (res.success && res.data) {
      const createdId = res.data.id;
      if (!isDraft) {
        // Automatically submit draft
        await requestApi.submit(createdId);
      }
      router.push(`/requests/${createdId}`);
    } else {
      errorMsg.value = res.message || 'Failed to create request.';
    }
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || 'Error saving request.';
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.form-card {
  max-width: 720px;
  margin: 0 auto;
}

.error-alert {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 0.75rem;
  border-radius: var(--radius-sm);
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.form-group {
  margin-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--surface-900);
}

.req {
  color: #dc2626;
}

.form-control {
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--surface-300);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-family: inherit;
  outline: none;
}
.form-control:focus {
  border-color: var(--primary-600);
}

.help-text {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--surface-200);
}
</style>
