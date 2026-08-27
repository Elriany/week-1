<template>
  <div class="users-view">
    <BaseCard>
      <template #header>
        <div class="card-header">
          <h3>{{ t('users.title') }}</h3>
          <BaseButton
            v-if="auth.can('users.create')"
            variant="primary"
            size="md"
            type="button"
            @click="openCreate"
          >
            {{ t('users.addUser') }}
          </BaseButton>
        </div>
      </template>

      <div v-if="loading" class="centered">
        <BaseSpinner />
      </div>

      <p v-else-if="loadError" class="error-text" role="alert">{{ loadError }}</p>

      <EmptyState
        v-else-if="users.length === 0"
        :title="t('users.empty.title')"
        :description="t('users.empty.description')"
      />

      <div v-else class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{{ t('users.columns.name') }}</th>
              <th>{{ t('users.columns.email') }}</th>
              <th>{{ t('users.columns.role') }}</th>
              <th>{{ t('users.columns.status') }}</th>
              <th v-if="auth.can('users.deactivate')">{{ t('users.columns.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in users" :key="row.id">
              <td>{{ displayName(row) }}</td>
              <td><bdi class="mono">{{ row.email }}</bdi></td>
              <td>{{ row.role ? localizedName(row.role) : '—' }}</td>
              <td>
                <BaseBadge
                  :variant="row.isActive ? 'success' : 'gray'"
                  :label="row.isActive ? t('users.status.active') : t('users.status.inactive')"
                />
              </td>
              <td v-if="auth.can('users.deactivate')">
                <BaseButton
                  v-if="row.id !== auth.user?.id"
                  :variant="row.isActive ? 'secondary' : 'primary'"
                  size="sm"
                  type="button"
                  :loading="pendingId === row.id"
                  @click="toggleActive(row)"
                >
                  {{ row.isActive ? t('users.deactivate') : t('users.activate') }}
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- Add User Dialog -->
    <BaseDialog
      :is-open="showCreate"
      :title="t('users.addUser')"
      @close="showCreate = false"
    >
      <form id="create-user-form" class="dialog-form" novalidate @submit.prevent="submitCreate">
        <BaseInput v-model="form.fullNameEn" :label="t('users.columns.nameEn')" required />
        <BaseInput v-model="form.fullNameAr" :label="t('users.columns.nameAr')" required />
        <BaseInput v-model="form.email" type="email" dir="ltr" autocomplete="off" :label="t('auth.email')" required />
        <BaseInput
          v-model="form.password"
          type="password"
          dir="ltr"
          autocomplete="new-password"
          :label="t('auth.password')"
          :error="createFieldErrors.password"
          required
        />

        <label class="select-field">
          <span>{{ t('users.columns.role') }}</span>
          <select v-model="form.roleId" required>
            <option value="" disabled>{{ t('users.selectRole') }}</option>
            <option v-for="role in roles" :key="role.id" :value="role.id">
              {{ localizedName(role) }}
            </option>
          </select>
        </label>

        <p v-if="createError" class="error-text" role="alert">{{ createError }}</p>
      </form>
      <template #footer>
        <BaseButton variant="secondary" size="md" type="button" @click="showCreate = false">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton variant="primary" size="md" type="submit" form="create-user-form" :loading="creating">
          {{ t('common.save') }}
        </BaseButton>
      </template>
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalizedName } from '@/composables/useLocalizedName'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'

interface UserRow {
  id: string
  email: string
  fullNameEn: string
  fullNameAr: string
  isActive: boolean
  branchId: string
  departmentId: string
  roleId: string
  role?: { id: string; code: string; nameEn: string; nameAr: string }
}

interface RoleRow {
  id: string
  code: string
  nameEn: string
  nameAr: string
  permissions: string[]
}

const { t } = useI18n()
const auth = useAuthStore()
const localizedName = useLocalizedName()

const users = ref<UserRow[]>([])
const roles = ref<RoleRow[]>([])
const loading = ref(false)
const loadError = ref('')
const pendingId = ref<string | null>(null)

const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const createFieldErrors = reactive({ password: '' })
const form = reactive({
  email: '',
  password: '',
  fullNameEn: '',
  fullNameAr: '',
  roleId: '',
})

function displayName(row: UserRow): string {
  return localizedName({ nameEn: row.fullNameEn, nameAr: row.fullNameAr })
}

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return t('errors.forbidden')
    if (err.status === 409) return t('users.errors.emailTaken')
    return err.serverMessage ?? t('errors.unreachable')
  }
  return t('errors.unreachable')
}

async function loadUsers() {
  loading.value = true
  loadError.value = ''
  try {
    const response = await api.get('/users')
    users.value = response.data
  } catch (err) {
    loadError.value = messageFor(err)
  } finally {
    loading.value = false
  }
}

async function loadRoles() {
  if (!auth.can('roles.read')) return
  try {
    const response = await api.get('/users/roles')
    roles.value = response.data
  } catch {
    // The create form simply offers no roles; listing still works.
  }
}

function openCreate() {
  createError.value = ''
  createFieldErrors.password = ''
  Object.assign(form, { email: '', password: '', fullNameEn: '', fullNameAr: '', roleId: '' })
  showCreate.value = true
}

async function submitCreate() {
  createError.value = ''
  createFieldErrors.password = ''

  if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) {
    createFieldErrors.password = t('auth.errors.passwordPolicy')
    return
  }

  creating.value = true
  try {
    await api.post('/users', {
      ...form,
      // A user created from this screen joins the creator's branch and department.
      branchId: auth.user!.branchId,
      departmentId: auth.user!.departmentId,
    })
    showCreate.value = false
    await loadUsers()
  } catch (err) {
    createError.value = messageFor(err)
  } finally {
    creating.value = false
  }
}

async function toggleActive(row: UserRow) {
  pendingId.value = row.id
  try {
    await api.patch(`/users/${row.id}/active`, { isActive: !row.isActive })
    await loadUsers()
  } catch (err) {
    loadError.value = messageFor(err)
  } finally {
    pendingId.value = null
  }
}

onMounted(() => {
  loadUsers()
  loadRoles()
})
</script>

<style scoped>
.users-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
}

.card-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.centered {
  display: flex;
  justify-content: center;
  padding: var(--spacing-8);
}

.error-text {
  margin: 0;
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}

/* Wide tables scroll inside their own container; the page never scrolls sideways. */
.table-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: var(--spacing-3);
  text-align: start;
  border-bottom: 1px solid var(--color-gray-200);
  white-space: nowrap;
}

th {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-700);
}

td {
  font-size: var(--font-size-sm);
  color: var(--color-gray-900);
}

.mono {
  font-family: monospace;
}

.create-form,
.dialog-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.select-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-700);
}

.select-field select {
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-family: inherit;
}

.form-actions {
  display: flex;
  gap: var(--spacing-2);
}
</style>
