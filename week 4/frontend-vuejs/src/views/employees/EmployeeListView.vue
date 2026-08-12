<template>
  <AppLayout>
    <div class="employees-page">
      <PageHeader
        :title="authStore.isManager ? 'My Department Employees' : 'Employee Directory'"
        :subtitle="authStore.isManager ? `Employees in ${authStore.user?.departmentName || 'your department'}` : 'View and manage organizational employees'"
      >
        <template #actions>
          <button v-if="authStore.isManager" @click="openAddModal" class="btn-primary">
            <i class="pi pi-user-plus"></i> Add Employee
          </button>
        </template>
      </PageHeader>

      <!-- Search & Filters -->
      <div class="filter-card">
        <div class="search-box">
          <i class="pi pi-search search-icon"></i>
          <input
            v-model="search"
            @input="debounceSearch"
            type="text"
            placeholder="Search employees by name, email, or number..."
            class="search-input"
          />
        </div>
        <select v-model="statusFilter" @change="fetchEmployees" class="filter-select">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="PENDING_ACTIVATION">Pending Activation</option>
          <option value="PENDING_DEACTIVATION">Pending Deactivation</option>
        </select>
      </div>

      <!-- Loading / Table -->
      <div v-if="loading" class="loading-box">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Loading employees...</span>
      </div>

      <div v-else class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Emp #</th>
              <th>Employee Name</th>
              <th>Email Address</th>
              <th>Department</th>
              <th>Status</th>
              <th>Joined Date</th>
              <th v-if="authStore.isManager" style="text-align: right;">Status Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="emp in employees" :key="emp.id">
              <td class="emp-num">{{ emp.employeeNumber }}</td>
              <td class="name-col">
                <strong>{{ emp.firstName }} {{ emp.lastName }}</strong>
              </td>
              <td>{{ emp.email }}</td>
              <td>{{ emp.departmentName || 'N/A' }}</td>
              <td><StatusBadge :status="emp.status" /></td>
              <td class="date-col">{{ formatDate(emp.createdAt) }}</td>

              <!-- Manager Status Request Actions -->
              <td v-if="authStore.isManager" style="text-align: right;">
                <button
                  v-if="emp.status === 'INACTIVE' || emp.status === 'PENDING_ACTIVATION'"
                  @click="openActivationModal(emp)"
                  class="btn-success btn-xs"
                >
                  <i class="pi pi-shield"></i> Request Activation
                </button>

                <button
                  v-if="emp.status === 'ACTIVE' || emp.status === 'PENDING_DEACTIVATION'"
                  @click="openDeactivationModal(emp)"
                  class="btn-danger btn-xs"
                >
                  <i class="pi pi-shield"></i> Request Deactivation
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Add Employee Modal (Manager) -->
      <div v-if="showAddModal" class="modal-overlay">
        <div class="modal-card">
          <h3>Add New Employee</h3>
          <p class="modal-sub">Add employee to {{ authStore.user?.departmentName }}. Initial status will be PENDING_ACTIVATION.</p>
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
            <input v-model="formEmail" type="email" placeholder="employee@approval.local" class="form-control" />
          </div>

          <div class="form-group">
            <label>Phone Number</label>
            <input v-model="formPhone" type="text" class="form-control" />
          </div>

          <div class="modal-actions">
            <button @click="showAddModal = false" class="btn-secondary">Cancel</button>
            <button @click="handleAddEmployee" :disabled="submitting" class="btn-primary">
              Add Employee
            </button>
          </div>
        </div>
      </div>

      <!-- Request Status Change Modal (Manager -> Admin) -->
      <div v-if="showStatusModal" class="modal-overlay">
        <div class="modal-card">
          <h3>{{ statusActionType === 'ACTIVATE' ? 'Request Employee Activation' : 'Request Employee Deactivation' }}</h3>
          <p>Submit a formal request to ADMIN to {{ statusActionType === 'ACTIVATE' ? 'activate' : 'deactivate' }} <strong>{{ targetEmployee?.firstName }} {{ targetEmployee?.lastName }}</strong>.</p>
          
          <div class="form-group" style="margin-top: 1rem;">
            <label>Reason / Justification for Admin</label>
            <textarea v-model="statusReason" rows="3" class="form-control" placeholder="Provide business context for admin approval..."></textarea>
          </div>

          <div v-if="modalError" class="modal-error">{{ modalError }}</div>

          <div class="modal-actions">
            <button @click="showStatusModal = false" class="btn-secondary">Cancel</button>
            <button @click="confirmStatusRequest" :disabled="submitting" class="btn-primary">
              Submit Request to Admin
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
import { useAuthStore } from '../../stores/auth.store';
import { employeeApi } from '../../api/employee.api';
import { User } from '../../types/user';

const authStore = useAuthStore();
const employees = ref<User[]>([]);
const loading = ref(true);
const search = ref('');
const statusFilter = ref('');

const showAddModal = ref(false);
const formFirstName = ref('');
const formLastName = ref('');
const formEmail = ref('');
const formPhone = ref('');

const showStatusModal = ref(false);
const targetEmployee = ref<User | null>(null);
const statusActionType = ref<'ACTIVATE' | 'DEACTIVATE'>('ACTIVATE');
const statusReason = ref('');

const submitting = ref(false);
const modalError = ref('');

let debounceTimer: any = null;
function debounceSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchEmployees, 300);
}

async function fetchEmployees() {
  loading.value = true;
  try {
    const res = await employeeApi.getAll({
      search: search.value,
      status: statusFilter.value,
    });
    if (res.success && res.data) {
      employees.value = res.data.items;
    }
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

function openAddModal() {
  formFirstName.value = '';
  formLastName.value = '';
  formEmail.value = '';
  formPhone.value = '';
  modalError.value = '';
  showAddModal.value = true;
}

async function handleAddEmployee() {
  if (!formFirstName.value || !formLastName.value || !formEmail.value) {
    modalError.value = 'First name, last name, and email are required.';
    return;
  }
  submitting.value = true;
  modalError.value = '';
  try {
    await employeeApi.create({
      firstName: formFirstName.value,
      lastName: formLastName.value,
      email: formEmail.value,
      phone: formPhone.value,
    });
    showAddModal.value = false;
    await fetchEmployees();
  } catch (err: any) {
    modalError.value = err.response?.data?.message || 'Error adding employee.';
  } finally {
    submitting.value = false;
  }
}

function openActivationModal(emp: User) {
  targetEmployee.value = emp;
  statusActionType.value = 'ACTIVATE';
  statusReason.value = '';
  modalError.value = '';
  showStatusModal.value = true;
}

function openDeactivationModal(emp: User) {
  targetEmployee.value = emp;
  statusActionType.value = 'DEACTIVATE';
  statusReason.value = '';
  modalError.value = '';
  showStatusModal.value = true;
}

async function confirmStatusRequest() {
  if (!targetEmployee.value) return;
  submitting.value = true;
  modalError.value = '';
  try {
    if (statusActionType.value === 'ACTIVATE') {
      await employeeApi.requestActivation(targetEmployee.value.id, statusReason.value);
    } else {
      await employeeApi.requestDeactivation(targetEmployee.value.id, statusReason.value);
    }
    showStatusModal.value = false;
    await fetchEmployees();
  } catch (err: any) {
    modalError.value = err.response?.data?.message || 'Error submitting status request.';
  } finally {
    submitting.value = false;
  }
}

function formatDate(isoStr?: string) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

onMounted(fetchEmployees);
</script>

<style scoped>
.filter-card {
  background: var(--surface-0);
  padding: 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--surface-200);
  display: flex;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.search-box { position: relative; flex: 1; }
.search-icon { position: absolute; left: 0.875rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
.search-input { width: 100%; padding: 0.5rem 0.875rem 0.5rem 2.5rem; border: 1px solid var(--surface-300); border-radius: var(--radius-sm); outline: none; }
.filter-select { padding: 0.5rem; border: 1px solid var(--surface-300); border-radius: var(--radius-sm); background: white; }

.table-card { background: var(--surface-0); border-radius: var(--radius-md); border: 1px solid var(--surface-200); overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.data-table th { background: var(--surface-50); padding: 0.75rem 1rem; text-transform: uppercase; font-size: 0.6875rem; color: var(--text-muted); border-bottom: 1px solid var(--surface-200); }
.data-table td { padding: 0.875rem 1rem; border-bottom: 1px solid var(--surface-200); }
.emp-num { font-family: monospace; font-weight: 700; color: var(--primary-700); }
.date-col { font-size: 0.8125rem; color: var(--text-muted); }

.btn-xs { padding: 0.25rem 0.5rem; font-size: 0.75rem; border-radius: 0.25rem; border: none; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.375rem; }
.btn-success { background: #16a34a; color: white; }
.btn-danger { background: #dc2626; color: white; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-card { background: white; padding: 1.5rem; border-radius: var(--radius-md); max-width: 460px; width: 100%; }
.modal-sub { font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.25rem; }
.modal-error { color: #dc2626; font-size: 0.8125rem; margin-top: 0.5rem; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.form-group { margin-bottom: 0.875rem; display: flex; flex-direction: column; gap: 0.25rem; }
.form-control { padding: 0.5rem; border: 1px solid var(--surface-300); border-radius: var(--radius-sm); }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.25rem; }
</style>
