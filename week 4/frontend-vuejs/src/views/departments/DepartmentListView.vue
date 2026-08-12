<template>
  <AppLayout>
    <div class="departments-page">
      <PageHeader
        title="Department Management"
        subtitle="Create, edit, and assign department managers"
      >
        <template #actions>
          <button @click="openCreateModal" class="btn-primary">
            <i class="pi pi-plus"></i> Create Department
          </button>
        </template>
      </PageHeader>

      <!-- Filter / Search Bar -->
      <div class="filter-card">
        <div class="search-box">
          <i class="pi pi-search search-icon"></i>
          <input
            v-model="search"
            @input="debounceSearch"
            type="text"
            placeholder="Search departments by name or code..."
            class="search-input"
          />
        </div>
      </div>

      <!-- Loading / Table -->
      <div v-if="loading" class="loading-box">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Loading departments...</span>
      </div>

      <div v-else class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Department Name</th>
              <th>Manager</th>
              <th>Employees</th>
              <th>Status</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="dept in departments" :key="dept.id">
              <td class="code-col">{{ dept.code }}</td>
              <td class="name-col">
                <strong>{{ dept.name }}</strong>
                <span class="desc-text">{{ dept.description || 'No description' }}</span>
              </td>
              <td>
                <span v-if="dept.managerFirstName" class="manager-text">
                  {{ dept.managerFirstName }} {{ dept.managerLastName }}
                </span>
                <span v-else class="no-manager">No Manager Assigned</span>
              </td>
              <td>{{ dept.employeeCount || 0 }} employees</td>
              <td>
                <span :class="['badge', dept.isActive ? 'badge-success' : 'badge-neutral']">
                  {{ dept.isActive ? 'ACTIVE' : 'INACTIVE' }}
                </span>
              </td>
              <td style="text-align: right;">
                <button @click="openEditModal(dept)" class="btn-secondary btn-sm">
                  <i class="pi pi-pencil"></i> Edit
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Create / Edit Modal -->
      <div v-if="showModal" class="modal-overlay">
        <div class="modal-card">
          <h3>{{ editingDept ? 'Edit Department' : 'Create Department' }}</h3>
          <div v-if="modalError" class="modal-error">{{ modalError }}</div>

          <div class="form-group">
            <label>Department Code <span class="req">*</span></label>
            <input v-model="formCode" type="text" placeholder="e.g. IT, FIN, HR" class="form-control" />
          </div>

          <div class="form-group">
            <label>Department Name <span class="req">*</span></label>
            <input v-model="formName" type="text" placeholder="e.g. Information Technology" class="form-control" />
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea v-model="formDescription" rows="3" class="form-control"></textarea>
          </div>

          <div class="form-group">
            <label>Active Status</label>
            <select v-model="formIsActive" class="form-control">
              <option :value="true">Active</option>
              <option :value="false">Inactive</option>
            </select>
          </div>

          <div class="modal-actions">
            <button @click="showModal = false" class="btn-secondary">Cancel</button>
            <button @click="handleSave" :disabled="submitting" class="btn-primary">
              {{ editingDept ? 'Save Changes' : 'Create Department' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AppLayout from '../../components/layout/AppLayout.vue';
import PageHeader from '../../components/common/PageHeader.vue';
import { departmentApi } from '../../api/department.api';
import { Department } from '../../types/department';

const departments = ref<Department[]>([]);
const loading = ref(true);
const search = ref('');

const showModal = ref(false);
const editingDept = ref<Department | null>(null);
const formCode = ref('');
const formName = ref('');
const formDescription = ref('');
const formIsActive = ref(true);
const submitting = ref(false);
const modalError = ref('');

let debounceTimer: any = null;
function debounceSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchDepartments, 300);
}

async function fetchDepartments() {
  loading.value = true;
  try {
    const res = await departmentApi.getAll({ search: search.value });
    if (res.success && res.data) {
      departments.value = res.data.items;
    }
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

function openCreateModal() {
  editingDept.value = null;
  formCode.value = '';
  formName.value = '';
  formDescription.value = '';
  formIsActive.value = true;
  modalError.value = '';
  showModal.value = true;
}

function openEditModal(dept: Department) {
  editingDept.value = dept;
  formCode.value = dept.code;
  formName.value = dept.name;
  formDescription.value = dept.description || '';
  formIsActive.value = dept.isActive;
  modalError.value = '';
  showModal.value = true;
}

async function handleSave() {
  if (!formCode.value || !formName.value) {
    modalError.value = 'Code and Name are required.';
    return;
  }
  submitting.value = true;
  modalError.value = '';
  try {
    if (editingDept.value) {
      await departmentApi.update(editingDept.value.id, {
        code: formCode.value,
        name: formName.value,
        description: formDescription.value,
        isActive: formIsActive.value,
      });
    } else {
      await departmentApi.create({
        code: formCode.value,
        name: formName.value,
        description: formDescription.value,
        isActive: formIsActive.value,
      });
    }
    showModal.value = false;
    await fetchDepartments();
  } catch (err: any) {
    modalError.value = err.response?.data?.message || 'Error saving department.';
  } finally {
    submitting.value = false;
  }
}

onMounted(fetchDepartments);
</script>

<style scoped>
.filter-card {
  background: var(--surface-0);
  padding: 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--surface-200);
  margin-bottom: 1.25rem;
}
.search-box { position: relative; max-width: 400px; }
.search-icon { position: absolute; left: 0.875rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
.search-input { width: 100%; padding: 0.5rem 0.875rem 0.5rem 2.5rem; border: 1px solid var(--surface-300); border-radius: var(--radius-sm); outline: none; }

.table-card { background: var(--surface-0); border-radius: var(--radius-md); border: 1px solid var(--surface-200); overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.data-table th { background: var(--surface-50); padding: 0.75rem 1rem; text-transform: uppercase; font-size: 0.6875rem; color: var(--text-muted); border-bottom: 1px solid var(--surface-200); }
.data-table td { padding: 0.875rem 1rem; border-bottom: 1px solid var(--surface-200); }
.code-col { font-family: monospace; font-weight: 700; color: var(--primary-700); }
.desc-text { display: block; font-size: 0.75rem; color: var(--text-muted); }
.no-manager { font-size: 0.8125rem; color: var(--text-muted); font-style: italic; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-card { background: white; padding: 1.5rem; border-radius: var(--radius-md); max-width: 440px; width: 100%; }
.modal-error { color: #dc2626; font-size: 0.8125rem; margin-bottom: 0.75rem; }
.form-group { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
.form-control { padding: 0.5rem; border: 1px solid var(--surface-300); border-radius: var(--radius-sm); }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.25rem; }
</style>
