<template>
  <div class="tickets-view">
    <BaseCard>
      <template #header>
        <div class="card-header">
          <h3>{{ t('tickets.title') }}</h3>
          <BaseButton
            v-if="auth.can('tickets.create')"
            variant="primary"
            size="md"
            type="button"
            @click="showCreateDialog = true"
          >
            {{ t('tickets.addTicket') }}
          </BaseButton>
        </div>
      </template>

      <!-- Search & Quick Filters -->
      <div class="filter-header">
        <BaseInput v-model="search" type="search" :label="t('tickets.search')" class="search-input" />
        <div class="filter-controls">
          <button
            type="button"
            class="filter-toggle"
            :class="{ active: showFilters }"
            @click="showFilters = !showFilters"
            :aria-label="showFilters ? 'Hide filters' : 'Show filters'"
          >
            🔽 {{ t('common.filters') }}
            <span v-if="activeFilterCount > 0" class="filter-badge">{{ activeFilterCount }}</span>
          </button>
          <BaseButton
            v-if="hasActiveFilters"
            variant="ghost"
            size="sm"
            type="button"
            @click="clearAllFilters"
          >
            {{ t('common.clearAll') }}
          </BaseButton>
        </div>
      </div>

      <!-- Collapsible Filters -->
      <transition name="slide-down">
        <div v-if="showFilters" class="filters-panel">
          <div class="filter-grid">
            <label class="select-field">
              <span>{{ t('tickets.columns.status') }}</span>
              <select v-model="statusFilter">
                <option value="">{{ t('tickets.filter.allStatuses') }}</option>
                <option v-for="status in meta.statuses" :key="status.code" :value="status.code">
                  {{ localizedName(status) }}
                </option>
              </select>
            </label>
            <label class="select-field">
              <span>{{ t('tickets.columns.priority') }}</span>
              <select v-model="priorityFilter">
                <option value="">{{ t('tickets.filter.allPriorities') }}</option>
                <option v-for="priority in meta.priorities" :key="priority.code" :value="priority.code">
                  {{ localizedName(priority) }}
                </option>
              </select>
            </label>
            <label class="select-field">
              <span>{{ t('tickets.columns.category') }}</span>
              <select v-model="categoryFilter">
                <option value="">{{ t('tickets.filter.allCategories') }}</option>
                <option v-for="category in meta.categories" :key="category.code" :value="category.code">
                  {{ localizedName(category) }}
                </option>
              </select>
            </label>
            <label class="select-field">
              <span>{{ t('tickets.columns.assignee') }}</span>
              <select v-model="assigneeFilter">
                <option value="">{{ t('tickets.filter.allAssignees') }}</option>
                <option v-for="user in assignees" :key="user.id" :value="user.id">
                  {{ displayName(user) }}
                </option>
              </select>
            </label>
          </div>
          <div class="checkbox-group">
            <label class="checkbox">
              <input v-model="unassignedOnly" type="checkbox" />
              {{ t('tickets.filter.unassigned') }}
            </label>
          </div>
        </div>
      </transition>

      <div v-if="loading" class="centered">
        <BaseSpinner />
      </div>

      <p v-else-if="loadError" class="error-text" role="alert">{{ loadError }}</p>

      <EmptyState
        v-else-if="tickets.length === 0 && !search.trim()"
        :title="t('tickets.empty.title')"
        :description="t('tickets.empty.description')"
      />

      <EmptyState
        v-else-if="tickets.length === 0 && search.trim()"
        :title="t('tickets.noResults.title')"
        :description="t('tickets.noResults.description')"
      />

      <div v-else class="table-scroll">
        <table>
          <thead>
            <tr>
              <th :aria-sort="sortBy === 'ticketNumber' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'">
                <button type="button" @click="toggleSort('ticketNumber')" class="sort-button">
                  {{ t('tickets.columns.number') }}
                  <span v-if="sortBy === 'ticketNumber'" class="sort-arrow">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </th>
              <th>{{ t('tickets.columns.subject') }}</th>
              <th>{{ t('tickets.columns.customer') }}</th>
              <th :aria-sort="sortBy === 'priority' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'">
                <button type="button" @click="toggleSort('priority')" class="sort-button">
                  {{ t('tickets.columns.priority') }}
                  <span v-if="sortBy === 'priority'" class="sort-arrow">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </th>
              <th>{{ t('tickets.columns.status') }}</th>
              <th :aria-sort="sortBy === 'createdAt' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'">
                <button type="button" @click="toggleSort('createdAt')" class="sort-button">
                  {{ t('tickets.columns.createdAt') }}
                  <span v-if="sortBy === 'createdAt'" class="sort-arrow">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </th>
              <th :aria-sort="sortBy === 'updatedAt' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'">
                <button type="button" @click="toggleSort('updatedAt')" class="sort-button">
                  {{ t('tickets.columns.updatedAt') }}
                  <span v-if="sortBy === 'updatedAt'" class="sort-arrow">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in tickets" :key="row.id">
              <td><RouterLink :to="{ name: 'ticket-detail', params: { id: row.id } }"><bdi class="mono">{{ row.ticketNumber }}</bdi></RouterLink></td>
              <td><RouterLink :to="{ name: 'ticket-detail', params: { id: row.id } }">{{ row.subject }}</RouterLink></td>
              <td><RouterLink :to="{ name: 'customer-detail', params: { id: row.customerId } }">{{ displayCustomerName(row) }}</RouterLink></td>
              <td>
                <BaseBadge
                  :variant="getPriorityVariant(row.priority?.code)"
                  :label="useLocalizedName()(row.priority)"
                />
              </td>
              <td>
                <BaseBadge
                  :variant="getStatusVariant(row.status?.code)"
                  :label="useLocalizedName()(row.status)"
                />
              </td>
              <td>{{ formatDate(row.createdAt) }}</td>
              <td>{{ formatDate(row.updatedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="tickets.length > 0" class="pagination">
        <BaseButton
          variant="secondary"
          size="sm"
          type="button"
          :disabled="page === 1"
          @click="page = Math.max(1, page - 1)"
        >
          {{ t('tickets.previous') }}
        </BaseButton>
        <span class="pagination-info">
          {{ t('tickets.showing', { start: formatNumber((page - 1) * PAGE_SIZE + 1), end: formatNumber(Math.min(page * PAGE_SIZE, total)), total: formatNumber(total) }) }}
        </span>
        <BaseButton
          variant="secondary"
          size="sm"
          type="button"
          :disabled="page * PAGE_SIZE >= total"
          @click="page = page + 1"
        >
          {{ t('tickets.next') }}
        </BaseButton>
      </div>
    </BaseCard>

    <!-- Create Dialog -->
    <BaseDialog
      :is-open="showCreateDialog"
      :title="t('tickets.create.title')"
      @close="showCreateDialog = false"
    >
      <form id="create-ticket-form" class="dialog-form" novalidate @submit.prevent="submitCreate">
        <BaseInput v-model="form.subject" :label="t('tickets.columns.subject')" required />
        <textarea
          v-model="form.description"
          class="textarea-input"
          :placeholder="t('tickets.notes.placeholder')"
        ></textarea>

        <label class="select-field">
          <span>{{ t('tickets.columns.customer') }} *</span>
          <input
            v-model="customerSearch"
            type="text"
            :placeholder="t('tickets.create.selectCustomer')"
            @input="handleCustomerSearch"
            class="select-input"
          />
          <div v-if="customerSearchResults.length > 0" class="search-results">
            <button
              v-for="customer in customerSearchResults"
              :key="customer.id"
              type="button"
              @click="selectCustomer(customer)"
              class="result-item"
            >
              {{ displayCustomerName(customer) }}
            </button>
          </div>
          <div v-if="selectedCustomer" class="selected-item">
            ✓ {{ displayCustomerName(selectedCustomer) }}
          </div>
        </label>

        <label class="select-field">
          <span>{{ t('tickets.columns.priority') }}</span>
          <select v-model="form.priorityCode">
            <option value="">{{ t('tickets.create.selectPriority') }}</option>
            <option v-for="priority in meta.priorities" :key="priority.code" :value="priority.code">
              {{ localizedName(priority) }}
            </option>
          </select>
        </label>

        <label class="select-field">
          <span>{{ t('tickets.columns.category') }}</span>
          <select v-model="form.categoryCode">
            <option value="">{{ t('tickets.create.selectCategory') }}</option>
            <option v-for="category in meta.categories" :key="category.code" :value="category.code">
              {{ localizedName(category) }}
            </option>
          </select>
        </label>

        <p v-if="createError" class="error-text" role="alert">{{ createError }}</p>
      </form>

      <template #footer>
        <BaseButton variant="secondary" size="md" type="button" @click="showCreateDialog = false">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton variant="primary" size="md" type="submit" form="create-ticket-form" :loading="creating">
          {{ t('common.save') }}
        </BaseButton>
      </template>
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, RouterLink } from 'vue-router'
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

interface Ref {
  code: string
  nameEn: string
  nameAr: string
}

interface Customer {
  id: string
  fullNameEn: string
  fullNameAr: string
}

interface AssigneeRow {
  id: string
  fullNameEn: string
  fullNameAr: string
}

interface TicketRow {
  id: string
  ticketNumber: string
  subject: string
  customerId: string
  customer?: Customer
  priority: Ref
  status: Ref
  category: Ref
  createdAt: Date
  updatedAt: Date
}

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const localizedName = useLocalizedName()
const { formatDate, formatNumber } = useFormat()

const tickets = ref<TicketRow[]>([])
const total = ref(0)
const page = ref(1)
const search = ref('')
const statusFilter = ref('')
const priorityFilter = ref('')
const categoryFilter = ref('')
const assigneeFilter = ref('')
const unassignedOnly = ref(false)
const sortBy = ref<'ticketNumber' | 'priority' | 'createdAt' | 'updatedAt'>('updatedAt')
const sortDir = ref<'asc' | 'desc'>('desc')

const loading = ref(false)
const loadError = ref('')

const meta = ref<{ statuses: Ref[]; priorities: Ref[]; categories: Ref[] }>({ statuses: [], priorities: [], categories: [] })
const assignees = ref<AssigneeRow[]>([])

const showCreateDialog = ref(false)
const showFilters = ref(false)
const creating = ref(false)
const createError = ref('')
const customerSearch = ref('')
const customerSearchResults = ref<Customer[]>([])
const selectedCustomer = ref<Customer | null>(null)

const form = reactive({
  subject: '',
  description: '',
  customerId: '',
  department: '',
  priorityCode: '',
  categoryCode: '',
})

const activeFilterCount = computed(() => {
  let count = 0
  if (statusFilter.value) count++
  if (priorityFilter.value) count++
  if (categoryFilter.value) count++
  if (assigneeFilter.value) count++
  if (unassignedOnly.value) count++
  return count
})

const hasActiveFilters = computed(() => activeFilterCount.value > 0)

let requestSeq = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined
let customerSearchTimer: ReturnType<typeof setTimeout> | undefined

function displayName(row: AssigneeRow): string {
  return localizedName({ nameEn: row.fullNameEn, nameAr: row.fullNameAr })
}

function displayCustomerName(row: any): string {
  return localizedName({ nameEn: row.fullNameEn || row.customer?.fullNameEn, nameAr: row.fullNameAr || row.customer?.fullNameAr })
}

function getPriorityVariant(code?: string): string {
  const priorityMap: Record<string, string> = {
    'URGENT': 'danger',
    'HIGH': 'warning',
    'MEDIUM': 'info',
    'LOW': 'success',
  }
  return priorityMap[code || ''] || 'gray'
}

function getStatusVariant(code?: string): string {
  const statusMap: Record<string, string> = {
    'NEW': 'info',
    'ASSIGNED': 'info',
    'IN_PROGRESS': 'warning',
    'PENDING_CUSTOMER': 'warning',
    'RESOLVED': 'success',
    'CLOSED': 'gray',
  }
  return statusMap[code || ''] || 'gray'
}

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return t('errors.forbidden')
    if (err.status === 409) return t('tickets.errors.invalidTransition')
    return err.serverMessage ?? t('errors.unreachable')
  }
  return t('errors.unreachable')
}

async function loadTickets() {
  const seq = ++requestSeq
  loading.value = true
  loadError.value = ''
  try {
    const params = new URLSearchParams()
    if (search.value.trim()) params.set('q', search.value.trim())
    if (statusFilter.value) params.set('status', statusFilter.value)
    if (priorityFilter.value) params.set('priority', priorityFilter.value)
    if (categoryFilter.value) params.set('category', categoryFilter.value)
    if (assigneeFilter.value) params.set('assigneeId', assigneeFilter.value)
    if (unassignedOnly.value) params.set('unassigned', 'true')
    params.set('page', String(page.value))
    params.set('pageSize', String(PAGE_SIZE))
    params.set('sortBy', sortBy.value)
    params.set('sortDir', sortDir.value)

    const response = await api.get(`/tickets?${params}`)
    if (seq !== requestSeq) return
    tickets.value = response.data.items.map((t: any) => ({
      ...t,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    }))
    total.value = response.data.total
  } catch (err) {
    if (seq !== requestSeq) return
    loadError.value = messageFor(err)
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

function toggleSort(column: 'ticketNumber' | 'priority' | 'createdAt' | 'updatedAt') {
  if (sortBy.value === column) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = column
    sortDir.value = 'desc'
  }
}

watch(search, () => {
  clearTimeout(searchTimer)
  page.value = 1
  searchTimer = setTimeout(loadTickets, 300)
})

watch([statusFilter, priorityFilter, categoryFilter, assigneeFilter, unassignedOnly, sortBy, sortDir], () => {
  page.value = 1
  loadTickets()
})

watch(page, loadTickets)

function clearAllFilters() {
  search.value = ''
  statusFilter.value = ''
  priorityFilter.value = ''
  categoryFilter.value = ''
  assigneeFilter.value = ''
  unassignedOnly.value = false
  page.value = 1
}

function openCreate() {
  createError.value = ''
  form.subject = ''
  form.description = ''
  form.department = ''
  form.priorityCode = ''
  form.categoryCode = ''
  selectedCustomer.value = null
  customerSearch.value = ''
  customerSearchResults.value = []
}

async function handleCustomerSearch() {
  clearTimeout(customerSearchTimer)
  if (customerSearch.value.trim().length < 2) {
    customerSearchResults.value = []
    return
  }
  customerSearchTimer = setTimeout(async () => {
    try {
      const response = await api.get(`/customers?q=${encodeURIComponent(customerSearch.value.trim())}`)
      customerSearchResults.value = response.data.items
    } catch (err) {
      customerSearchResults.value = []
    }
  }, 300)
}

function selectCustomer(customer: Customer) {
  selectedCustomer.value = customer
  form.customerId = customer.id
  customerSearch.value = displayCustomerName(customer)
  customerSearchResults.value = []
}

async function submitCreate() {
  createError.value = ''

  if (!selectedCustomer.value) {
    createError.value = t('tickets.create.selectCustomer')
    return
  }

  creating.value = true
  try {
    const response = await api.post('/tickets', {
      subject: form.subject,
      description: form.description,
      customerId: form.customerId,
      priorityCode: form.priorityCode || undefined,
      categoryCode: form.categoryCode || undefined,
      branchId: auth.user!.branchId,
    })
    showCreateDialog.value = false
    router.push({ name: 'ticket-detail', params: { id: response.data.id } })
  } catch (err) {
    createError.value = messageFor(err)
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  try {
    const [metaRes, usersRes] = await Promise.all([
      api.get('/tickets/meta'),
      api.get('/tickets/assignable-users'),
    ])
    meta.value = metaRes.data
    assignees.value = usersRes.data
    await loadTickets()
  } catch (err) {
    loadError.value = messageFor(err)
  }
})

onUnmounted(() => {
  clearTimeout(searchTimer)
  clearTimeout(customerSearchTimer)
})
</script>

<style scoped>
.tickets-view {
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

.checkbox {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.checkbox input {
  cursor: pointer;
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

.sort-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: inherit;
  color: inherit;
  font-weight: inherit;
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: 0;
}

.sort-button:hover {
  text-decoration: underline;
}

.sort-arrow {
  font-size: var(--font-size-xs);
  color: var(--color-primary);
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

.select-field select,
.select-input {
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-family: inherit;
}

.search-results {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
}

.result-item {
  display: block;
  width: 100%;
  padding: var(--spacing-2) var(--spacing-3);
  text-align: start;
  border: none;
  background: none;
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.result-item:hover {
  background-color: var(--color-gray-100);
}

.selected-item {
  padding: var(--spacing-2) var(--spacing-3);
  background-color: var(--color-gray-100);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.textarea-input {
  width: 100%;
  min-height: 120px;
  padding: var(--spacing-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-family: monospace;
  font-size: var(--font-size-sm);
  resize: vertical;
}

.form-actions {
  display: flex;
  gap: var(--spacing-2);
}

.filter-header {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 250px;
}

.search-input :deep(> div) {
  width: 100%;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.filter-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  background-color: white;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.filter-toggle:hover {
  border-color: var(--color-gray-400);
  background-color: var(--color-gray-50);
}

.filter-toggle.active {
  border-color: var(--color-primary);
  background-color: var(--color-primary-50);
  color: var(--color-primary);
}

.filter-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 var(--spacing-1);
  background-color: var(--color-danger);
  color: white;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.filters-panel {
  padding: var(--spacing-4);
  background-color: var(--color-gray-50);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-gray-200);
  margin-bottom: var(--spacing-4);
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-3);
}

.checkbox-group {
  display: flex;
  gap: var(--spacing-4);
  flex-wrap: wrap;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.dialog-form .textarea-input {
  min-height: 100px;
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.dialog-form :deep(.base-input) {
  width: 100%;
}

.select-input,
.select-field select {
  width: 100%;
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  background-color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.select-field select:hover,
.select-input:hover {
  border-color: var(--color-gray-400);
}

.select-field select:focus,
.select-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
}

.selected-item {
  padding: var(--spacing-2) var(--spacing-3);
  background-color: var(--color-primary-50);
  border: 1px solid var(--color-primary-200);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-primary-900);
}

.error-text {
  padding: var(--spacing-2) var(--spacing-3);
  background-color: #fee;
  border-left: 4px solid var(--color-danger);
  border-radius: var(--radius-sm);
  color: var(--color-danger);
}

/* Mobile */
@media (max-width: 768px) {
  .filter-header {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    min-width: auto;
  }

  .filter-controls {
    flex-wrap: wrap;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>
