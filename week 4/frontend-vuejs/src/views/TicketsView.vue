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
            @click="openCreate"
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
            :aria-label="showFilters ? t('common.hideFilters') : t('common.showFilters')"
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
              <select v-model="statusId">
                <option value="">{{ t('tickets.filter.allStatuses') }}</option>
                <option v-for="status in meta.statuses" :key="status.id" :value="status.id">
                  {{ localizedName(status) }}
                </option>
              </select>
            </label>
            <label class="select-field">
              <span>{{ t('tickets.columns.priority') }}</span>
              <select v-model="priorityId">
                <option value="">{{ t('tickets.filter.allPriorities') }}</option>
                <option v-for="priority in meta.priorities" :key="priority.id" :value="priority.id">
                  {{ localizedName(priority) }}
                </option>
              </select>
            </label>
            <label class="select-field">
              <span>{{ t('tickets.columns.category') }}</span>
              <select v-model="categoryId">
                <option value="">{{ t('tickets.filter.allCategories') }}</option>
                <option v-for="category in meta.categories" :key="category.id" :value="category.id">
                  {{ localizedName(category) }}
                </option>
              </select>
            </label>
            <label class="select-field">
              <span>{{ t('tickets.columns.assignee') }}</span>
              <select v-model="assignedUserId">
                <option value="">{{ t('tickets.filter.allAssignees') }}</option>
                <option v-for="user in assignees" :key="user.id" :value="user.id">
                  {{ displayName(user) }}
                </option>
              </select>
            </label>
            <label class="select-field">
              <span>{{ t('tickets.sla.label') }}</span>
              <select v-model="slaStatus">
                <option value="">{{ t('tickets.filter.allSla') }}</option>
                <option value="ON_TRACK">{{ t('tickets.sla.status.ON_TRACK') }}</option>
                <option value="AT_RISK">{{ t('tickets.sla.status.AT_RISK') }}</option>
                <option value="BREACHED">{{ t('tickets.sla.status.BREACHED') }}</option>
                <option value="MET">{{ t('tickets.sla.status.MET') }}</option>
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
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col" :aria-sort="sortBy === 'ticketNumber' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'">
                <button type="button" @click="toggleSort('ticketNumber')" class="sort-button">
                  {{ t('tickets.columns.number') }}
                  <span v-if="sortBy === 'ticketNumber'" class="sort-arrow">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </th>
              <th scope="col">{{ t('tickets.columns.subject') }}</th>
              <th scope="col">{{ t('tickets.columns.customer') }}</th>
              <th scope="col" :aria-sort="sortBy === 'priority' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'">
                <button type="button" @click="toggleSort('priority')" class="sort-button">
                  {{ t('tickets.columns.priority') }}
                  <span v-if="sortBy === 'priority'" class="sort-arrow">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </th>
              <th scope="col">{{ t('tickets.columns.status') }}</th>
              <th scope="col">{{ t('tickets.sla.label') }}</th>
              <th scope="col" :aria-sort="sortBy === 'createdAt' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'">
                <button type="button" @click="toggleSort('createdAt')" class="sort-button">
                  {{ t('tickets.columns.createdAt') }}
                  <span v-if="sortBy === 'createdAt'" class="sort-arrow">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </th>
              <th scope="col" :aria-sort="sortBy === 'updatedAt' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'">
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
                  :variant="priorityVariant(row.priority?.code)"
                  :label="localizedName(row.priority)"
                />
              </td>
              <td>
                <BaseBadge
                  :variant="statusVariant(row.status?.code)"
                  :label="localizedName(row.status)"
                />
              </td>
              <td><SlaBadge :sla="row.sla" /></td>
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
        <label class="select-field">
          <span>{{ t('tickets.columns.description') }}</span>
          <textarea
            v-model="form.description"
            class="textarea-input"
            :placeholder="t('tickets.create.descriptionPlaceholder')"
          ></textarea>
        </label>

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
import { priorityVariant, statusVariant } from '@/composables/ticketBadges'
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { useFormat } from '@/composables/useFormat'
import { useTicketFilters } from '@/composables/useTicketFilters'
import { useApiError } from '@/composables/useApiError'
import { useTicketMeta } from '@/composables/useTicketMeta'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import SlaBadge from '@/components/tickets/SlaBadge.vue'

const PAGE_SIZE = 20

interface Ref {
  id: string
  code: string
  nameEn: string
  nameAr: string
}

interface SlaSnapshot {
  status: 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'MET'
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
  sla: SlaSnapshot | null
  createdAt: Date
  updatedAt: Date
}

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const localizedName = useLocalizedName()
const { formatDate, formatNumber } = useFormat()
const { messageFor: messageForBase } = useApiError()
const ticketMeta = useTicketMeta()

const {
  statusId,
  priorityId,
  categoryId,
  assignedUserId,
  unassignedOnly,
  slaStatus,
  activeFilterCount,
  hasActiveFilters,
  clearAllFilters: clearTicketFilters,
} = useTicketFilters()

const tickets = ref<TicketRow[]>([])
const total = ref(0)
const page = ref(1)
const search = ref('')
/** Scopes the list to one customer's tickets, e.g. a link from that
 * customer's detail screen — not one of the UI filter-panel controls,
 * so it is not counted in useTicketFilters' activeFilterCount. */
const customerId = ref<string | undefined>()
const sortBy = ref<'ticketNumber' | 'priority' | 'createdAt' | 'updatedAt'>('updatedAt')
const sortDir = ref<'asc' | 'desc'>('desc')

const loading = ref(false)
const loadError = ref('')

const meta = ticketMeta.meta
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

let requestSeq = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined
let customerSearchTimer: ReturnType<typeof setTimeout> | undefined

function displayName(row: AssigneeRow): string {
  return localizedName({ nameEn: row.fullNameEn, nameAr: row.fullNameAr })
}

function displayCustomerName(row: { fullNameEn?: string; fullNameAr?: string; customer?: { fullNameEn?: string; fullNameAr?: string } | null }): string {
  return localizedName({ nameEn: row.fullNameEn || row.customer?.fullNameEn, nameAr: row.fullNameAr || row.customer?.fullNameAr })
}

const ERROR_OVERRIDES = { 409: 'tickets.errors.invalidTransition' }
function messageFor(err: unknown): string {
  return messageForBase(err, ERROR_OVERRIDES)
}

async function loadTickets() {
  const seq = ++requestSeq
  loading.value = true
  loadError.value = ''
  try {
    const params = new URLSearchParams()
    if (search.value.trim()) params.set('q', search.value.trim())
    if (statusId.value) params.set('statusId', statusId.value)
    if (priorityId.value) params.set('priorityId', priorityId.value)
    if (categoryId.value) params.set('categoryId', categoryId.value)
    if (assignedUserId.value) params.set('assignedUserId', assignedUserId.value)
    if (unassignedOnly.value) params.set('unassigned', 'true')
    if (slaStatus.value) params.set('slaStatus', slaStatus.value)
    if (customerId.value) params.set('customerId', customerId.value)
    params.set('page', String(page.value))
    params.set('pageSize', String(PAGE_SIZE))
    params.set('sortBy', sortBy.value)
    params.set('sortDir', sortDir.value)

    const response = await api.get(`/tickets?${params}`)
    if (seq !== requestSeq) return
    tickets.value = response.data.items.map((t: Omit<TicketRow, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string }) => ({
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

// Guards against the initial route.query hydration (below) firing a second,
// redundant request on top of the explicit one in onMounted.
let initialized = false

watch(search, () => {
  if (!initialized) return
  clearTimeout(searchTimer)
  page.value = 1
  searchTimer = setTimeout(loadTickets, 300)
})

watch([statusId, priorityId, categoryId, assignedUserId, unassignedOnly, slaStatus, sortBy, sortDir], () => {
  page.value = 1
  if (initialized) loadTickets()
})

watch(page, loadTickets)

function clearAllFilters() {
  search.value = ''
  clearTicketFilters()
  page.value = 1
}

function openCreate() {
  createError.value = ''
  form.subject = ''
  form.description = ''
  form.customerId = ''
  form.department = ''
  form.priorityCode = ''
  form.categoryCode = ''
  selectedCustomer.value = null
  customerSearch.value = ''
  customerSearchResults.value = []
  showCreateDialog.value = true
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
    } catch {
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

/**
 * Seeds filter state from the query string on mount, so a dashboard tile's
 * link (e.g. `{ assignedUserId, slaStatus: 'BREACHED' }`) lands on an
 * already-filtered list rather than the unfiltered default.
 */
function hydrateFromQuery() {
  const q = route.query
  if (typeof q.statusId === 'string') statusId.value = q.statusId
  if (typeof q.priorityId === 'string') priorityId.value = q.priorityId
  if (typeof q.categoryId === 'string') categoryId.value = q.categoryId
  if (typeof q.assignedUserId === 'string') assignedUserId.value = q.assignedUserId
  if (q.unassigned === 'true') unassignedOnly.value = true
  if (typeof q.slaStatus === 'string') slaStatus.value = q.slaStatus
  if (typeof q.q === 'string') search.value = q.q
  if (typeof q.customerId === 'string') customerId.value = q.customerId
}

onMounted(async () => {
  hydrateFromQuery()
  try {
    const [, usersRes] = await Promise.all([
      ticketMeta.load(),
      api.get('/tickets/assignable-users'),
    ])
    assignees.value = usersRes.data
    await loadTickets()
  } catch (err) {
    loadError.value = messageFor(err)
  } finally {
    initialized = true
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
  background-color: var(--color-danger-50);
  border-inline-start: 4px solid var(--color-danger);
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
