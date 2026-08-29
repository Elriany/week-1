<template>
  <div class="portal-tickets-view">
    <BaseCard>
      <template #header>
        <div class="card-header">
          <h3>{{ t('portal.title') }}</h3>
          <BaseButton variant="primary" size="md" type="button" @click="router.push({ name: 'portal-new-ticket' })">
            {{ t('portal.newRequest') }}
          </BaseButton>
        </div>
      </template>

      <div v-if="!unlinked" class="filters">
        <BaseInput v-model="search" type="search" :label="t('customers.search')" />
        <label class="select-field">
          <span>{{ t('tickets.columns.status') }}</span>
          <select v-model="statusFilter">
            <option value="">{{ t('tickets.filter.allStatuses') }}</option>
            <option v-for="status in ticketMeta.meta.value.statuses" :key="status.id" :value="status.id">
              {{ localizedName(status) }}
            </option>
          </select>
        </label>
      </div>

      <div v-if="loading" class="centered">
        <BaseSpinner />
      </div>

      <div v-else-if="unlinked" class="unlinked-state">
        <strong>{{ t('portal.unlinked.title') }}</strong>
        <p>{{ t('portal.unlinked.description') }}</p>
      </div>

      <p v-else-if="loadError" class="error-text" role="alert">{{ loadError }}</p>

      <EmptyState
        v-else-if="tickets.length === 0 && !search.trim()"
        :title="t('portal.empty.title')"
        :description="t('portal.empty.description')"
      />

      <EmptyState
        v-else-if="tickets.length === 0 && search.trim()"
        :title="t('portal.noResults.title')"
        :description="t('portal.noResults.description')"
      />

      <div v-else class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col">{{ t('portal.columns.number') }}</th>
              <th scope="col">{{ t('portal.columns.subject') }}</th>
              <th scope="col">{{ t('portal.columns.status') }}</th>
              <th scope="col">{{ t('portal.columns.sla') }}</th>
              <th scope="col">{{ t('portal.columns.created') }}</th>
              <th scope="col">{{ t('portal.columns.updated') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in tickets" :key="row.id">
              <td>
                <RouterLink :to="{ name: 'portal-ticket-detail', params: { id: row.id } }">
                  <bdi class="mono">{{ row.ticketNumber }}</bdi>
                </RouterLink>
              </td>
              <td>{{ row.subject }}</td>
              <td><BaseBadge :variant="statusVariant(row.status?.code)" :label="localizedName(row.status)" /></td>
              <td><SlaBadge :sla="row.sla" /></td>
              <td>{{ formatDate(row.createdAt) }}</td>
              <td>{{ formatDate(row.updatedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="tickets.length > 0" class="pagination">
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
import { statusVariant } from '@/composables/ticketBadges'
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { useFormat } from '@/composables/useFormat'
import { useApiError } from '@/composables/useApiError'
import { useTicketMeta } from '@/composables/useTicketMeta'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SlaBadge from '@/components/tickets/SlaBadge.vue'

const PAGE_SIZE = 20

interface Ref_ {
  id: string
  code: string
  nameEn: string
  nameAr: string
}

interface PortalTicketRow {
  id: string
  ticketNumber: string
  subject: string
  status: Ref_
  sla: { status: 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'MET' } | null
  createdAt: Date
  updatedAt: Date
}

const { t } = useI18n()
const router = useRouter()
const localizedName = useLocalizedName()
const { formatDate, formatNumber } = useFormat()
const { messageFor } = useApiError()

const tickets = ref<PortalTicketRow[]>([])
const ticketMeta = useTicketMeta()
const total = ref(0)
const page = ref(1)
const search = ref('')
const statusFilter = ref('')
const loading = ref(true)
const loadError = ref('')
const unlinked = ref(false)

let requestSeq = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined

async function loadTickets() {
  const seq = ++requestSeq
  loading.value = true
  loadError.value = ''
  try {
    const params = new URLSearchParams()
    if (search.value.trim()) params.set('q', search.value.trim())
    if (statusFilter.value) params.set('statusId', statusFilter.value)
    params.set('page', String(page.value))
    params.set('pageSize', String(PAGE_SIZE))

    const response = await api.get(`/portal/tickets?${params}`)
    if (seq !== requestSeq) return
    unlinked.value = false
    tickets.value = response.data.items.map((row: Omit<PortalTicketRow, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string }) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }))
    total.value = response.data.total
  } catch (err) {
    if (seq !== requestSeq) return
    if (err instanceof ApiError && err.status === 403) {
      unlinked.value = true
    } else {
      loadError.value = messageFor(err)
    }
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

watch(search, () => {
  clearTimeout(searchTimer)
  page.value = 1
  searchTimer = setTimeout(loadTickets, 300)
})

watch([statusFilter, page], loadTickets)

onMounted(() => {
  ticketMeta.load().catch(() => {
    // The status filter degrades to "all" — the list itself still loads.
  })
  loadTickets()
})

onUnmounted(() => clearTimeout(searchTimer))
</script>

<style scoped>
.portal-tickets-view {
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

.unlinked-state {
  padding: var(--spacing-4);
  background-color: var(--color-warning-50);
  border: 1px solid var(--color-warning-200);
  border-radius: var(--radius-md);
  color: var(--color-gray-800);
  line-height: 1.6;
}

.table-scroll {
  overflow-x: auto;
}


.mono {
  font-family: monospace;
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
