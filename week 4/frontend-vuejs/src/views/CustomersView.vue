<template>
  <div class="customers-view">
    <BaseCard>
      <template #header>
        <div class="card-header">
          <h3>{{ t('customers.title') }}</h3>
          <BaseButton
            v-if="auth.can('customers.create')"
            variant="primary"
            size="md"
            type="button"
            @click="openCreate"
          >
            {{ t('customers.addCustomer') }}
          </BaseButton>
        </div>
      </template>

      <div class="filters">
        <BaseInput v-model="search" type="search" :label="t('customers.search')" />
        <label class="select-field">
          <span>{{ t('customers.columns.status') }}</span>
          <select v-model="statusFilter">
            <option value="">{{ t('customers.filter.all') }}</option>
            <option value="true">{{ t('customers.status.active') }}</option>
            <option value="false">{{ t('customers.status.inactive') }}</option>
          </select>
        </label>
      </div>

      <div v-if="loading" class="centered">
        <BaseSpinner />
      </div>

      <p v-else-if="loadError" class="error-text" role="alert">{{ loadError }}</p>

      <EmptyState
        v-else-if="customers.length === 0 && !search.trim()"
        :title="t('customers.empty.title')"
        :description="t('customers.empty.description')"
      />

      <EmptyState
        v-else-if="customers.length === 0 && search.trim()"
        :title="t('customers.noResults.title')"
        :description="t('customers.noResults.description')"
      />

      <div v-else class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{{ t('customers.columns.code') }}</th>
              <th>{{ t('customers.columns.name') }}</th>
              <th>{{ t('customers.columns.email') }}</th>
              <th>{{ t('customers.columns.phone') }}</th>
              <th>{{ t('customers.columns.language') }}</th>
              <th>{{ t('customers.columns.status') }}</th>
              <th v-if="auth.can('customers.update') || auth.can('customers.delete')">{{ t('customers.columns.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in customers" :key="row.id">
              <td><RouterLink :to="{ name: 'customer-detail', params: { id: row.id } }"><bdi class="mono">{{ row.code }}</bdi></RouterLink></td>
              <td>{{ displayName(row) }}</td>
              <td><bdi>{{ row.email || '—' }}</bdi></td>
              <td><bdi>{{ row.phone || '—' }}</bdi></td>
              <td>{{ row.preferredLanguage === 'ar' ? t('common.arabic') : t('common.english') }}</td>
              <td>
                <BaseBadge
                  :variant="row.isActive ? 'success' : 'gray'"
                  :label="row.isActive ? t('customers.status.active') : t('customers.status.inactive')"
                />
              </td>
              <td v-if="auth.can('customers.update') || auth.can('customers.delete')">
                <div class="actions">
                  <BaseButton
                    v-if="auth.can('customers.update')"
                    :variant="row.isActive ? 'secondary' : 'primary'"
                    size="sm"
                    type="button"
                    :loading="pendingId === row.id"
                    @click="toggleActive(row)"
                  >
                    {{ row.isActive ? t('customers.deactivate') : t('customers.activate') }}
                  </BaseButton>
                  <BaseButton
                    v-if="auth.can('customers.delete')"
                    variant="danger"
                    size="sm"
                    type="button"
                    @click="confirmDelete(row)"
                  >
                    {{ t('customers.delete') }}
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="customers.length > 0" class="pagination">
        <BaseButton
          variant="secondary"
          size="sm"
          type="button"
          :disabled="page === 1"
          @click="page = Math.max(1, page - 1)"
        >
          {{ t('customers.previous') }}
        </BaseButton>
        <span class="pagination-info">
          {{ t('customers.showing', { start: formatNumber((page - 1) * PAGE_SIZE + 1), end: formatNumber(Math.min(page * PAGE_SIZE, total)), total: formatNumber(total) }) }}
        </span>
        <BaseButton
          variant="secondary"
          size="sm"
          type="button"
          :disabled="page * PAGE_SIZE >= total"
          @click="page = page + 1"
        >
          {{ t('customers.next') }}
        </BaseButton>
      </div>
    </BaseCard>

    <!-- Add Customer Dialog -->
    <BaseDialog
      :is-open="showCreate"
      :title="t('customers.addCustomer')"
      @close="showCreate = false"
    >
      <form id="create-customer-form" class="dialog-form" novalidate @submit.prevent="submitCreate">
        <BaseInput v-model="form.fullNameEn" :label="t('customers.columns.nameEn')" required />
        <BaseInput v-model="form.fullNameAr" :label="t('customers.columns.nameAr')" required />
        <BaseInput v-model="form.email" type="email" dir="ltr" :label="t('customers.columns.email')" />
        <BaseInput v-model="form.phone" type="tel" :label="t('customers.columns.phone')" />
        <BaseInput
          v-model="form.code"
          type="text"
          dir="ltr"
          :label="t('customers.columns.code')"
          :placeholder="t('customers.generatedCode')"
        />

        <label class="select-field">
          <span>{{ t('customers.columns.language') }}</span>
          <select v-model="form.preferredLanguage">
            <option value="en">{{ t('common.english') }}</option>
            <option value="ar">{{ t('common.arabic') }}</option>
          </select>
        </label>

        <p v-if="createError" class="error-text" role="alert">{{ createError }}</p>
      </form>
      <template #footer>
        <BaseButton variant="secondary" size="md" type="button" @click="showCreate = false">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton variant="primary" size="md" type="submit" form="create-customer-form" :loading="creating">
          {{ t('common.save') }}
        </BaseButton>
      </template>
    </BaseDialog>

    <!-- Delete Confirmation Dialog -->
    <BaseDialog
      :is-open="deleteModal.show"
      :title="t('customers.confirmDelete')"
      @close="deleteModal.show = false"
    >
      <p class="delete-message">{{ t('common.confirmDelete', { name: displayName(deleteModal.customer!) }) }}</p>
      <template #footer>
        <BaseButton variant="secondary" size="md" type="button" @click="deleteModal.show = false">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton variant="danger" size="md" type="button" :loading="deleting" @click="submitDelete">
          {{ t('common.delete') }}
        </BaseButton>
      </template>
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { useFormat } from '@/composables/useFormat'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'

const PAGE_SIZE = 20

interface CustomerRow {
  id: string
  code: string
  fullNameEn: string
  fullNameAr: string
  email: string | null
  phone: string | null
  preferredLanguage: string
  isActive: boolean
  branchId: string
  createdAt: Date
  updatedAt: Date
}

const { t } = useI18n()
const auth = useAuthStore()
const localizedName = useLocalizedName()
const { formatNumber } = useFormat()

const customers = ref<CustomerRow[]>([])
const total = ref(0)
const page = ref(1)
const search = ref('')
const statusFilter = ref('')
const loading = ref(false)
const loadError = ref('')
const pendingId = ref<string | null>(null)

const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const form = reactive({
  fullNameEn: '',
  fullNameAr: '',
  email: '',
  phone: '',
  code: '',
  preferredLanguage: 'en',
})

const deleteModal = reactive({
  show: false,
  customer: null as CustomerRow | null,
})
const deleting = ref(false)

let requestSeq = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined

function displayName(row: CustomerRow): string {
  return localizedName({ nameEn: row.fullNameEn, nameAr: row.fullNameAr })
}

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return t('errors.forbidden')
    if (err.status === 409) return t('customers.errors.codeTaken')
    return err.serverMessage ?? t('errors.unreachable')
  }
  return t('errors.unreachable')
}

async function loadCustomers() {
  const seq = ++requestSeq
  loading.value = true
  loadError.value = ''
  try {
    const params = new URLSearchParams()
    if (search.value.trim()) params.set('q', search.value.trim())
    if (statusFilter.value) params.set('isActive', statusFilter.value)
    params.set('page', String(page.value))
    params.set('pageSize', String(PAGE_SIZE))

    const response = await api.get(`/customers?${params}`)
    if (seq !== requestSeq) return
    customers.value = response.data.items
    total.value = response.data.total
  } catch (err) {
    if (seq !== requestSeq) return
    loadError.value = messageFor(err)
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

watch(search, () => {
  clearTimeout(searchTimer)
  page.value = 1
  searchTimer = setTimeout(loadCustomers, 300)
})

watch([statusFilter, page], loadCustomers)

function openCreate() {
  createError.value = ''
  Object.assign(form, { fullNameEn: '', fullNameAr: '', email: '', phone: '', code: '', preferredLanguage: 'en' })
  showCreate.value = true
}

async function submitCreate() {
  createError.value = ''

  creating.value = true
  try {
    await api.post('/customers', {
      fullNameEn: form.fullNameEn,
      fullNameAr: form.fullNameAr,
      email: form.email || null,
      phone: form.phone || null,
      code: form.code || undefined,
      preferredLanguage: form.preferredLanguage,
      branchId: auth.user!.branchId,
    })
    showCreate.value = false
    page.value = 1
    await loadCustomers()
  } catch (err) {
    createError.value = messageFor(err)
  } finally {
    creating.value = false
  }
}

async function toggleActive(row: CustomerRow) {
  pendingId.value = row.id
  try {
    await api.patch(`/customers/${row.id}/active`, { isActive: !row.isActive })
    await loadCustomers()
  } catch (err) {
    loadError.value = messageFor(err)
  } finally {
    pendingId.value = null
  }
}

function confirmDelete(row: CustomerRow) {
  deleteModal.customer = row
  deleteModal.show = true
}

async function submitDelete() {
  if (!deleteModal.customer) return
  deleting.value = true
  try {
    await api.delete(`/customers/${deleteModal.customer.id}`)
    deleteModal.show = false
    await loadCustomers()
  } catch (err) {
    loadError.value = messageFor(err)
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  loadCustomers()
})

onUnmounted(() => clearTimeout(searchTimer))
</script>

<style scoped>
.customers-view {
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

.filters {
  display: flex;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-4);
  flex-wrap: wrap;
}

.filters > :deep(div) {
  flex: 1;
  min-width: 250px;
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

.actions {
  display: flex;
  gap: var(--spacing-2);
  white-space: normal;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-3);
  margin-top: var(--spacing-4);
  flex-wrap: wrap;
}

.pagination-info {
  font-size: var(--font-size-sm);
  color: var(--color-gray-700);
  white-space: nowrap;
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

.create-form,
.dialog-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.form-actions {
  display: flex;
  gap: var(--spacing-2);
}

.delete-message {
  padding: var(--spacing-3);
  background-color: #fee;
  border-left: 4px solid var(--color-danger);
  border-radius: var(--radius-sm);
  color: var(--color-danger);
  margin: 0;
  font-size: var(--font-size-sm);
}
</style>
