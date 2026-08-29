<template>
  <div class="audit-view">
    <BaseCard>
      <template #header>
        <h3>{{ t('audit.title') }}</h3>
      </template>

      <p class="page-subtitle">{{ t('audit.subtitle') }}</p>

      <form class="filters" @submit.prevent="applyFilters">
        <label class="select-field">
          <span>{{ t('audit.columns.entityType') }}</span>
          <select v-model="filters.entityType">
            <option value="">{{ t('audit.filter.allTypes') }}</option>
            <option v-for="type in ENTITY_TYPES" :key="type" :value="type">{{ entityTypeLabel(type) }}</option>
          </select>
        </label>

        <label class="select-field">
          <span>{{ t('audit.columns.action') }}</span>
          <select v-model="filters.action">
            <option value="">{{ t('audit.filter.allActions') }}</option>
            <option v-for="action in ACTIONS" :key="action" :value="action">{{ actionLabel(action) }}</option>
          </select>
        </label>

        <label class="select-field">
          <span>{{ t('audit.columns.actor') }}</span>
          <select v-model="filters.actorUserId">
            <option value="">{{ t('audit.filter.allActors') }}</option>
            <option v-for="user in actors" :key="user.id" :value="user.id">{{ displayName(user) }}</option>
          </select>
        </label>

        <label class="select-field">
          <span>{{ t('audit.filter.from') }}</span>
          <input v-model="filters.from" type="date" />
        </label>

        <label class="select-field">
          <span>{{ t('audit.filter.to') }}</span>
          <input v-model="filters.to" type="date" />
        </label>

        <div class="filter-actions">
          <BaseButton variant="primary" size="md" type="submit">{{ t('audit.filter.apply') }}</BaseButton>
          <BaseButton variant="secondary" size="md" type="button" @click="clearFilters">{{ t('audit.filter.clear') }}</BaseButton>
        </div>
      </form>

      <div v-if="loading" class="centered">
        <BaseSpinner />
      </div>

      <p v-else-if="loadError" class="error-text" role="alert">{{ loadError }}</p>

      <EmptyState
        v-else-if="entries.length === 0"
        :title="t('audit.empty.title')"
        :description="t('audit.empty.description')"
      />

      <div v-else class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col" />
              <th scope="col">{{ t('audit.columns.timestamp') }}</th>
              <th scope="col">{{ t('audit.columns.actor') }}</th>
              <th scope="col">{{ t('audit.columns.action') }}</th>
              <th scope="col">{{ t('audit.columns.entityType') }}</th>
              <th scope="col">{{ t('audit.columns.summary') }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="row in entries" :key="row.id">
              <tr>
                <td>
                  <button type="button" class="expand-button" @click="toggleExpanded(row.id)">
                    {{ expandedId === row.id ? '▲' : '▼' }}
                  </button>
                </td>
                <td>{{ formatDateTime(row.createdAt) }}</td>
                <td>{{ row.actor ? displayName(row.actor) : '—' }}</td>
                <td>{{ actionLabel(row.action) }}</td>
                <td>
                  <RouterLink v-if="row.entityType === 'Ticket' && row.entityId" :to="{ name: 'ticket-detail', params: { id: row.entityId } }">
                    {{ entityTypeLabel(row.entityType) }}
                  </RouterLink>
                  <span v-else>{{ entityTypeLabel(row.entityType) }}</span>
                </td>
                <td>{{ row.summary }}</td>
              </tr>
              <tr v-if="expandedId === row.id" class="details-row">
                <td colspan="6">
                  <pre v-if="row.details !== null">{{ JSON.stringify(row.details, null, 2) }}</pre>
                  <span v-else class="muted">{{ t('audit.noDetails') }}</span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div v-if="entries.length > 0" class="pagination">
        <BaseButton variant="secondary" size="sm" type="button" :disabled="page === 1" @click="page = Math.max(1, page - 1)">
          {{ t('customers.previous') }}
        </BaseButton>
        <span class="pagination-info">
          {{ t('customers.showing', { start: formatNumber((page - 1) * PAGE_SIZE + 1), end: formatNumber(Math.min(page * PAGE_SIZE, total)), total: formatNumber(total) }) }}
        </span>
        <BaseButton variant="secondary" size="sm" type="button" :disabled="page * PAGE_SIZE >= total" @click="page = page + 1">
          {{ t('customers.next') }}
        </BaseButton>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { useFormat } from '@/composables/useFormat'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { useApiError } from '@/composables/useApiError'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const PAGE_SIZE = 25

const ENTITY_TYPES = [
  'Ticket', 'Branch', 'Department', 'TicketCategory', 'TicketPriority',
  'TicketStatus', 'KbArticle', 'KbCategory', 'SlaPolicy', 'User',
] as const

const ACTIONS = [
  'TICKET_CREATED', 'TICKET_STATUS_CHANGED', 'TICKET_ASSIGNED', 'TICKET_UNASSIGNED',
  'TICKET_PRIORITY_CHANGED', 'CONFIG_CREATED', 'CONFIG_UPDATED', 'CONFIG_DEACTIVATED',
  'KB_ARTICLE_PUBLISHED', 'KB_ARTICLE_UNPUBLISHED', 'SLA_POLICY_UPDATED',
] as const

interface Person {
  id: string
  fullNameEn: string
  fullNameAr: string
}

interface AuditEntry {
  id: string
  action: string
  entityType: string
  entityId: string | null
  summary: string
  details: unknown
  actor: Person | null
  createdAt: Date
}

const { t, te } = useI18n()
const { formatDateTime, formatNumber } = useFormat()
const localizedName = useLocalizedName()
const { messageFor } = useApiError()

const entries = ref<AuditEntry[]>([])
const actors = ref<Person[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const loadError = ref('')
const expandedId = ref<string | null>(null)
let requestSeq = 0

const filters = reactive({ entityType: '', action: '', actorUserId: '', from: '', to: '' })

function displayName(person: Person): string {
  return localizedName({ nameEn: person.fullNameEn, nameAr: person.fullNameAr })
}

/** An action or entity type the UI has no translation for falls back to its
 *  raw code — Story 19 typed the audit action filter as a free string
 *  precisely so a future action stays usable without a UI change. */
function actionLabel(action: string): string {
  const key = `audit.action.${action}`
  return te(key) ? t(key) : action
}

function entityTypeLabel(entityType: string): string {
  const key = `audit.entityType.${entityType}`
  return te(key) ? t(key) : entityType
}

function toggleExpanded(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

async function loadEntries() {
  const seq = ++requestSeq
  loading.value = true
  loadError.value = ''
  try {
    const params = new URLSearchParams()
    if (filters.entityType) params.set('entityType', filters.entityType)
    if (filters.action) params.set('action', filters.action)
    if (filters.actorUserId) params.set('actorUserId', filters.actorUserId)
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
    params.set('page', String(page.value))
    params.set('pageSize', String(PAGE_SIZE))

    const response = await api.get(`/audit?${params}`)
    if (seq !== requestSeq) return
    entries.value = response.data.items.map((row: Omit<AuditEntry, 'createdAt'> & { createdAt: string }) => ({ ...row, createdAt: new Date(row.createdAt) }))
    total.value = response.data.total
  } catch (err) {
    if (seq !== requestSeq) return
    loadError.value = messageFor(err)
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

async function loadActors() {
  try {
    const response = await api.get('/users')
    actors.value = response.data
  } catch {
    // The actor filter degrades to "all" — the log itself still loads.
  }
}

function applyFilters() {
  page.value = 1
  loadEntries()
}

function clearFilters() {
  Object.assign(filters, { entityType: '', action: '', actorUserId: '', from: '', to: '' })
  page.value = 1
  loadEntries()
}

watch(page, loadEntries)

onMounted(() => {
  loadActors()
  loadEntries()
})
</script>

<style scoped>
.audit-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.filters {
  display: flex;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-4);
  flex-wrap: wrap;
  align-items: flex-end;
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
.select-field input {
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-family: inherit;
}

.filter-actions {
  display: flex;
  gap: var(--spacing-2);
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


.expand-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.details-row td {
  white-space: normal;
  background-color: var(--color-gray-50);
}

.details-row pre {
  margin: 0;
  font-size: var(--font-size-xs);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.muted {
  color: var(--color-gray-500);
  font-size: var(--font-size-sm);
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
</style>
