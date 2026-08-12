<template>
  <AppLayout>
    <div class="managers-page">
      <PageHeader
        title="Manager Directory"
        subtitle="Manage department managers and assignments"
      >
        <template #actions>
          <button @click="openCreateModal" class="btn-primary">
            <i class="pi pi-user-plus"></i> Add Manager
          </button>
        </template>
      </PageHeader>

      <div class="filter-card">
        <div class="search-box">
          <i class="pi pi-search search-icon"></i>
          <input
            v-model="search"
            @input="debounceSearch"
            type="text"
            placeholder="Search managers by name or email..."
            class="search-input"
          />
        </div>
      </div>

      <div v-if="loading" class="loading-box">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Loading managers...</span>
      </div>

      <div v-else class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Emp #</th>
              <th>Manager Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Status</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="mgr in managers" :key="mgr.id">
              <td class="emp-num">{{ mgr.employeeNumber }}</td>
              <td class="name-col">
                <strong>{{ mgr.firstName }} {{ mgr.lastName }}</strong>
              </td>
              <td>{{ mgr.email }}</td>
              <td>
                <span v-if="mgr.departmentName" class="dept-badge">
                  {{ mgr.departmentName }} ({{ mgr.departmentCode }})
                </span>
                <span v-else class="no-dept">Unassigned</span>
              </td>
              <td><StatusBadge :status="mgr.status" /></td>
              <td style="text-align: right;">
                <button @click="openEditModal(mgr)" class="btn-secondary btn-sm">
                  <i class="pi pi-pencil"></i> Edit / Assign Dept
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Create / Edit Modal -->
      <div v-if="showModal" class="modal-overlay">
        <div class="modal-card">
          <h3>{{ editingMgr ? 'Edit Manager' : 'Create Manager' }}</h3>
          <div v-if="modalError" class="modal-error">{{ modalError }}</div>

          <div class="form-row">
            <div class="form-group">
              <label>First Name <span class="req">*</span></label>
              <input v-model="formFirstName" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>Last Name <span class="req">*</span></label>
              <input v-model="formLastName" type="text" class="form-control" />
            </div>
          </div>

          <div class="form-group">
            <label>Email Address <span class="req">*</span></label>
            <input v-model="formEmail" type="email" class="form-control" />
          </div>

          <div class="form-group">
            <label>Assigned Department</label>
            <select v-model="formDeptId" class="form-control">
              <option :value="null">-- Unassigned --</option>
              <option v-for="d in departmentList" :key="d.id" :value="d.id">
                {{ d.name }} ({{ d.code }})
              </option>
            </select>
            <small class="help-text">Business rule: A manager can only be assigned to one department.</small>
          </div>

          <div class="modal-actions">
            <button @click="showModal = false" class="btn-secondary">Cancel</button>
            <button @click="handleSave" :disabled="submitting" class="btn-primary">
              {{ editingMgr ? 'Save Changes' : 'Create Manager' }}
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
import StatusBadge from '../../components/common/StatusBadge.vue';
import { managerApi } from '../../api/manager.api';
import { departmentApi } from '../../api/department.api';
import { User } from '../../types/user';
import { Department } from '../../types/department';

const managers = ref<User[]>([]);
const departmentList = ref<Department[]>([]);
const loading = ref(true);
const search = ref('');

const showModal = ref(false);
const editingMgr = ref<User | null>(null);
const formFirstName = ref('');
const formLastName = ref('');
const formEmail = ref('');
const formDeptId = ref<number | null>(null);
const submitting = ref(false);
const modalError = ref('');

let debounceTimer: any = null;
function debounceSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchManagers, 300);
}

async function fetchManagers() {
  loading.value = true;
  try {
    const [mgrRes, deptRes] = await Promise.all([
      managerApi.getAll({ search: search.value }),
      departmentApi.getAll({ pageSize: 100 }),
    ]);
    if (mgrRes.success && mgrRes.data) managers.value = mgrRes.data.items;
    if (deptRes.success && deptRes.data) departmentList.value = deptRes.data.items;
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

function openCreateModal() {
  editingMgr.value = null;
  formFirstName.value = '';
  formLastName.value = '';
  formEmail.value = '';
  formDeptId.value = null;
  modalError.value = '';
  showModal.value = true;
}

function openEditModal(mgr: User) {
  editingMgr.value = mgr;
  formFirstName.value = mgr.firstName;
  formLastName.value = mgr.lastName;
  formEmail.value = mgr.email;
  formDeptId.value = mgr.departmentId || null;
  modalError.value = '';
  showModal.value = true;
}

async function handleSave() {
  if (!formFirstName.value || !formLastName.value || !formEmail.value) {
    modalError.value = 'First name, last name, and email are required.';
    return;
  }
  submitting.value = true;
  modalError.value = '';
  try {
    if (editingMgr.value) {
      await managerApi.update(editingMgr.value.id, {
        firstName: formFirstName.value,
        lastName: formLastName.value,
        email: formEmail.value,
        departmentId: formDeptId.value || undefined,
      });
    } else {
      await managerApi.create({
        firstName: formFirstName.value,
        lastName: formLastName.value,
        email: formEmail.value,
        departmentId: formDeptId.value || undefined,
      });
    }
    showModal.value = false;
    await fetchManagers();
  } catch (err: any) {
    modalError.value = err.response?.data?.message || 'Error saving manager.';
  } finally {
    submitting.value = false;
  }
}

onMounted(fetchManagers);
</script>

<style scoped>
.filter-card { background: var(--surface-0); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--surface-200); margin-bottom: 1.25rem; }
.search-box { position: relative; max-width: 400px; }
.search-icon { position: absolute; left: 0.875rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
.search-input { width: 100%; padding: 0.5rem 0.875rem 0.5rem 2.5rem; border: 1px solid var(--surface-300); border-radius: var(--radius-sm); outline: none; }

.table-card { background: var(--surface-0); border-radius: var(--radius-md); border: 1px solid var(--surface-200); overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.data-table th { background: var(--surface-50); padding: 0.75rem 1rem; text-transform: uppercase; font-size: 0.6875rem; color: var(--text-muted); border-bottom: 1px solid var(--surface-200); }
.data-table td { padding: 0.875rem 1rem; border-bottom: 1px solid var(--surface-200); }
.emp-num { font-family: monospace; font-weight: 700; color: var(--primary-700); }
.dept-badge { font-weight: 600; color: var(--surface-900); }
.no-dept { font-size: 0.8125rem; color: var(--text-muted); font-style: italic; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-card { background: white; padding: 1.5rem; border-radius: var(--radius-md); max-width: 460px; width: 100%; }
.modal-error { color: #dc2626; font-size: 0.8125rem; margin-bottom: 0.75rem; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.form-group { margin-bottom: 0.875rem; display: flex; flex-direction: column; gap: 0.25rem; }
.form-control { padding: 0.5rem; border: 1px solid var(--surface-300); border-radius: var(--radius-sm); }
.help-text { font-size: 0.75rem; color: var(--text-muted); }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.25rem; }
</style>
