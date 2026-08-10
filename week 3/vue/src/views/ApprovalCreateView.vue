<template>
  <div class="container" style="max-width: 640px;">
    <div class="page-header">
      <h1 class="page-title">Create Approval Request</h1>
      <router-link to="/approvals" class="btn btn-secondary">← Back to List</router-link>
    </div>

    <div class="card">
      <div v-if="errorMessage" class="alert alert-danger">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label class="form-label" for="vue-title">Request Title *</label>
          <input
            id="vue-title"
            type="text"
            class="form-control"
            :class="{ 'is-invalid': titleError }"
            v-model="title"
            @blur="validateTitle"
            placeholder="e.g. Software License Request"
          />
          <div v-if="titleError" class="invalid-feedback">
            <span v-if="!title">Title is required.</span>
            <span v-else-if="title.length < 3">Title must be at least 3 characters.</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="vue-desc">Detailed Description *</label>
          <textarea
            id="vue-desc"
            rows="4"
            class="form-control"
            :class="{ 'is-invalid': descError }"
            v-model="description"
            @blur="validateDesc"
            placeholder="Provide context and details for your approval request..."
          ></textarea>
          <div v-if="descError" class="invalid-feedback">
            <span v-if="!description">Description is required.</span>
            <span v-else-if="description.length < 5">Description must be at least 5 characters.</span>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
          <router-link to="/approvals" class="btn btn-secondary">Cancel</router-link>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <span v-if="loading" class="spinner" style="width: 1rem; height: 1rem; margin-right: 0.5rem;"></span>
            {{ loading ? 'Submitting...' : 'Submit Request' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { approvalService } from '../services/approval.service';

const router = useRouter();

const title = ref('');
const description = ref('');
const titleError = ref(false);
const descError = ref(false);
const loading = ref(false);
const errorMessage = ref('');

function validateTitle() {
  titleError.value = !title.value || title.value.trim().length < 3;
}

function validateDesc() {
  descError.value = !description.value || description.value.trim().length < 5;
}

async function handleSubmit() {
  validateTitle();
  validateDesc();

  if (titleError.value || descError.value) {
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const res = await approvalService.createApproval({
      title: title.value.trim(),
      description: description.value.trim()
    });
    loading.value = false;

    if (res.success) {
      router.push('/approvals');
    } else {
      errorMessage.value = res.message || 'Failed to create approval request.';
    }
  } catch (err: any) {
    loading.value = false;
    errorMessage.value = err.response?.data?.message || 'Failed to create approval request. Check FastAPI status.';
  }
}
</script>
