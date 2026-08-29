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
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col">{{ t('users.columns.name') }}</th>
              <th scope="col">{{ t('users.columns.email') }}</th>
              <th scope="col">{{ t('users.columns.role') }}</th>
              <th scope="col">{{ t('users.columns.status') }}</th>
              <th scope="col">{{ t('users.columns.customer') }}</th>
              <th scope="col" v-if="auth.can('users.deactivate') || auth.can('admin.manage')">{{ t('users.columns.actions') }}</th>
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
              <td>{{ row.customerId ? customerNames.get(row.customerId) ?? row.customerId : '—' }}</td>
              <td v-if="auth.can('users.deactivate') || auth.can('admin.manage')">
                <div class="actions">
                  <BaseButton
                    v-if="auth.can('users.deactivate') && row.id !== auth.user?.id"
                    :variant="row.isActive ? 'secondary' : 'primary'"
                    size="sm"
                    type="button"
                    :loading="pendingId === row.id"
                    @click="toggleActive(row)"
                  >
                    {{ row.isActive ? t('users.deactivate') : t('users.activate') }}
                  </BaseButton>
                  <BaseButton
                    v-if="auth.can('admin.manage') && row.role?.code === 'CUSTOMER'"
                    variant="secondary"
                    size="sm"
                    type="button"
                    @click="openLink(row)"
                  >
                    {{ t('users.link.action') }}
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- Link Customer Dialog -->
    <BaseDialog :is-open="showLink" :title="t('users.link.title')" @close="showLink = false">
      <div class="link-dialog">
        <p v-if="linkTarget?.customerId" class="current-link">
          {{ t('users.link.current') }}: <strong>{{ customerNames.get(linkTarget.customerId) ?? linkTarget.customerId }}</strong>
          <BaseButton variant="danger" size="sm" type="button" :loading="linking" @click="submitUnlink">
            {{ t('users.link.unlink') }}
          </BaseButton>
        </p>
        <p v-else class="current-link">{{ t('users.link.none') }}</p>

        <BaseInput v-model="linkSearch" type="search" :label="t('users.link.search')" />

        <div v-if="linkResults.length > 0" class="link-results">
          <button
            v-for="customer in linkResults"
            :key="customer.id"
            type="button"
            class="link-result"
            @click="submitLink(customer)"
          >
            {{ displayCustomerName(customer) }}
          </button>
        </div>

        <p v-if="linkError" class="error-text" role="alert">{{ linkError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="md" type="button" @click="showLink = false">
          {{ t('common.cancel') }}
        </BaseButton>
      </template>
    </BaseDialog>

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
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { useApiError } from '@/composables/useApiError'
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
  customerId: string | null
}

interface CustomerOption {
  id: string
  fullNameEn: string
  fullNameAr: string
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
const { messageFor: messageForBase } = useApiError()

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

const customerNames = ref<Map<string, string>>(new Map())

function displayName(row: UserRow): string {
  return localizedName({ nameEn: row.fullNameEn, nameAr: row.fullNameAr })
}

function displayCustomerName(customer: CustomerOption): string {
  return localizedName({ nameEn: customer.fullNameEn, nameAr: customer.fullNameAr })
}

const ERROR_OVERRIDES = { 409: 'users.errors.emailTaken' }
function messageFor(err: unknown): string {
  return messageForBase(err, ERROR_OVERRIDES)
}

async function loadUsers() {
  loading.value = true
  loadError.value = ''
  try {
    const response = await api.get('/users')
    users.value = response.data
    await loadCustomerNames()
  } catch (err) {
    loadError.value = messageFor(err)
  } finally {
    loading.value = false
  }
}

/** Best-effort — the list endpoint carries only the linked customer's id, and
 * a name lookup failing (e.g. no customers.read) must not break the user list. */
async function loadCustomerNames() {
  const ids = [...new Set(users.value.map(u => u.customerId).filter((id): id is string => Boolean(id)))]
  const missing = ids.filter(id => !customerNames.value.has(id))
  if (missing.length === 0) return

  const results = await Promise.allSettled(missing.map(id => api.get(`/customers/${id}`)))
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      customerNames.value.set(missing[index]!, displayCustomerName(result.value.data))
    }
  })
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

const showLink = ref(false)
const linkTarget = ref<UserRow | null>(null)
const linkSearch = ref('')
const linkResults = ref<CustomerOption[]>([])
const linkError = ref('')
const linking = ref(false)
let linkSearchTimer: ReturnType<typeof setTimeout> | undefined

function openLink(row: UserRow) {
  linkTarget.value = row
  linkSearch.value = ''
  linkResults.value = []
  linkError.value = ''
  showLink.value = true
}

async function searchLinkCustomers() {
  if (!linkSearch.value.trim()) {
    linkResults.value = []
    return
  }
  try {
    const response = await api.get(`/customers?q=${encodeURIComponent(linkSearch.value.trim())}&pageSize=10`)
    linkResults.value = response.data.items
  } catch {
    linkResults.value = []
  }
}

watch(linkSearch, () => {
  clearTimeout(linkSearchTimer)
  linkSearchTimer = setTimeout(searchLinkCustomers, 300)
})

function linkErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return t('users.link.alreadyLinked')
    if (err.status === 422) {
      const details = err.details as Record<string, unknown> | undefined
      if (details && 'userId' in details) return t('users.link.notCustomerRole')
      if (details && 'customerId' in details) return t('users.link.inactiveCustomer')
    }
  }
  return messageFor(err)
}

async function submitLink(customer: CustomerOption) {
  if (!linkTarget.value) return
  linkError.value = ''
  linking.value = true
  try {
    await api.patch(`/users/${linkTarget.value.id}/customer`, { customerId: customer.id })
    showLink.value = false
    await loadUsers()
  } catch (err) {
    linkError.value = linkErrorMessage(err)
  } finally {
    linking.value = false
  }
}

async function submitUnlink() {
  if (!linkTarget.value) return
  linkError.value = ''
  linking.value = true
  try {
    await api.patch(`/users/${linkTarget.value.id}/customer`, { customerId: null })
    showLink.value = false
    await loadUsers()
  } catch (err) {
    linkError.value = linkErrorMessage(err)
  } finally {
    linking.value = false
  }
}

onMounted(() => {
  loadUsers()
  loadRoles()
})

onUnmounted(() => clearTimeout(linkSearchTimer))
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


.mono {
  font-family: monospace;
}

.actions {
  display: flex;
  gap: var(--spacing-2);
  white-space: normal;
}

.link-dialog {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.current-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin: 0;
  font-size: var(--font-size-sm);
}

.link-results {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  max-height: 12rem;
  overflow-y: auto;
}

.link-result {
  text-align: start;
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  background: none;
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.link-result:hover {
  background-color: var(--color-gray-50);
  border-color: var(--color-primary);
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
