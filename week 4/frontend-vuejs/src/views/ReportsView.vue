<template>
  <div class="reports-view">
    <BaseCard>
      <template #header>
        <h2>{{ t('reports.title') }}</h2>
      </template>

      <p class="page-subtitle">{{ t('reports.subtitle') }}</p>

      <div class="range-row">
        <label class="range-field">
          <span>{{ t('reports.from') }}</span>
          <input v-model="fromInput" type="date" />
        </label>
        <label class="range-field">
          <span>{{ t('reports.to') }}</span>
          <input v-model="toInput" type="date" />
        </label>
        <BaseButton variant="primary" size="sm" type="button" @click="applyRange">
          {{ t('reports.apply') }}
        </BaseButton>
        <span class="range-label">{{ appliedRangeLabel }}</span>
      </div>
    </BaseCard>

    <div v-if="loading" class="centered">
      <BaseSpinner />
    </div>

    <p v-else-if="loadError" class="error-text" role="alert">{{ loadError }}</p>

    <template v-else-if="data">
      <div class="tiles-grid">
        <div class="tile">
          <div class="tile-value">{{ formatNumber(data.totals.total) }}</div>
          <div class="tile-label">{{ t('reports.totals.total') }}</div>
        </div>
        <div class="tile">
          <div class="tile-value">{{ formatNumber(data.totals.open) }}</div>
          <div class="tile-label">{{ t('reports.totals.open') }}</div>
        </div>
        <div class="tile">
          <div class="tile-value">{{ formatNumber(data.totals.closed) }}</div>
          <div class="tile-label">{{ t('reports.totals.closed') }}</div>
        </div>
        <div class="tile">
          <div class="tile-value">{{ formatNumber(data.totals.unassigned) }}</div>
          <div class="tile-label">{{ t('reports.totals.unassigned') }}</div>
        </div>
      </div>

      <div class="cards-grid">
        <BaseCard :title="t('reports.section.byStatus')">
          <BreakdownTable :buckets="data.byStatus" :total="data.totals.total" />
        </BaseCard>
        <BaseCard :title="t('reports.section.byPriority')">
          <BreakdownTable :buckets="data.byPriority" :total="data.totals.total" />
        </BaseCard>
        <BaseCard :title="t('reports.section.byCategory')">
          <BreakdownTable :buckets="data.byCategory" :total="data.totals.total" :uncategorized-key="'UNCATEGORIZED'" />
        </BaseCard>
        <BaseCard :title="t('reports.section.byChannel')">
          <BreakdownTable :buckets="data.byChannel" :total="data.totals.total" />
        </BaseCard>
      </div>

      <BaseCard :title="t('reports.section.workload')">
        <table class="workload-table">
          <thead>
            <tr>
              <th scope="col">{{ t('reports.columns.agent') }}</th>
              <th scope="col">{{ t('reports.columns.open') }}</th>
              <th scope="col">{{ t('reports.columns.resolved') }}</th>
              <th scope="col">{{ t('reports.columns.breached') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in data.agentWorkload" :key="row.userId">
              <td>
                <RouterLink v-if="row.filter && Object.keys(row.filter).length > 0" :to="{ name: 'tickets', query: { ...row.filter } }">
                  {{ agentName(row) }}
                </RouterLink>
                <span v-else>{{ row.userId === 'UNKNOWN' ? t('reports.unknownAgent') : agentName(row) }}</span>
              </td>
              <td>{{ formatNumber(row.openCount) }}</td>
              <td>{{ formatNumber(row.resolvedCount) }}</td>
              <td>{{ formatNumber(row.breachedCount) }}</td>
            </tr>
          </tbody>
        </table>
      </BaseCard>

      <BaseCard :title="t('reports.section.resolution')">
        <div class="resolution-grid">
          <div class="resolution-stat">
            <div class="stat-value">{{ formatNumber(data.resolution.resolvedCount) }}</div>
            <div class="stat-label">{{ t('reports.resolution.count') }}</div>
          </div>
          <div class="resolution-stat">
            <div class="stat-value">
              {{ data.resolution.avgResolutionMinutes === null ? '—' : formatNumber(Math.round(data.resolution.avgResolutionMinutes)) }}
            </div>
            <div class="stat-label">
              {{ data.resolution.avgResolutionMinutes === null ? t('reports.resolution.noData') : `${t('reports.resolution.average')} (${t('reports.resolution.minutes')})` }}
            </div>
          </div>
          <div class="resolution-stat">
            <div class="stat-value">
              {{ data.resolution.medianResolutionMinutes === null ? '—' : formatNumber(Math.round(data.resolution.medianResolutionMinutes)) }}
            </div>
            <div class="stat-label">
              {{ data.resolution.medianResolutionMinutes === null ? t('reports.resolution.noData') : `${t('reports.resolution.median')} (${t('reports.resolution.minutes')})` }}
            </div>
          </div>
        </div>
      </BaseCard>

      <BaseCard :title="t('reports.section.sla')">
        <table class="workload-table">
          <tbody>
            <tr v-for="bucket in data.sla" :key="bucket.key">
              <td>
                <SlaBadge :sla="{ status: bucket.key as SlaStatus }" />
              </td>
              <td class="count-cell">{{ formatNumber(bucket.count) }}</td>
              <td class="count-cell">{{ slaPercent(bucket.count) }}%</td>
            </tr>
          </tbody>
        </table>
      </BaseCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h, defineComponent, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { useFormat } from '@/composables/useFormat'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { useApiError } from '@/composables/useApiError'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import SlaBadge from '@/components/tickets/SlaBadge.vue'

type SlaStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'MET'

interface CountBucket {
  key: string
  labelEn: string
  labelAr: string
  count: number
  filter: Record<string, string>
}

interface AgentWorkloadRow {
  userId: string
  fullNameEn: string
  fullNameAr: string
  openCount: number
  resolvedCount: number
  breachedCount: number
  filter: Record<string, string>
}

interface ReportData {
  range: { from: string | null; to: string | null }
  totals: { total: number; open: number; closed: number; unassigned: number }
  byStatus: CountBucket[]
  byPriority: CountBucket[]
  byCategory: CountBucket[]
  byChannel: CountBucket[]
  agentWorkload: AgentWorkloadRow[]
  resolution: { resolvedCount: number; avgResolutionMinutes: number | null; medianResolutionMinutes: number | null }
  sla: CountBucket[]
  slaNoPolicyCount: number
}

const { t } = useI18n()
const { formatNumber } = useFormat()
const localizedName = useLocalizedName()
const { messageFor: messageForBase } = useApiError()

const data = ref<ReportData | null>(null)
const loading = ref(true)
const loadError = ref('')
const fromInput = ref('')
const toInput = ref('')
let requestSeq = 0

function agentName(row: AgentWorkloadRow): string {
  return localizedName({ nameEn: row.fullNameEn, nameAr: row.fullNameAr })
}

function slaPercent(count: number): number {
  const totalSla = (data.value?.sla ?? []).reduce((sum, b) => sum + b.count, 0)
  if (totalSla === 0) return 0
  return Math.round((count / totalSla) * 100)
}

/** Labelled from the API's echoed `range`, not from the (possibly unapplied) inputs. */
const appliedRangeLabel = computed(() => {
  if (!data.value) return ''
  const { from, to } = data.value.range
  if (!from && !to) return t('reports.allTime')
  const fromStr = from ? new Date(from).toLocaleDateString() : '…'
  const toStr = to ? new Date(to).toLocaleDateString() : '…'
  return t('reports.rangeLabel', { from: fromStr, to: toStr })
})

const ERROR_OVERRIDES = { 422: 'reports.errors.invalidRange' }
function messageFor(err: unknown): string {
  return messageForBase(err, ERROR_OVERRIDES)
}

async function loadReports() {
  const seq = ++requestSeq
  loading.value = true
  loadError.value = ''
  try {
    const params = new URLSearchParams()
    if (fromInput.value) params.set('from', fromInput.value)
    if (toInput.value) params.set('to', toInput.value)
    const qs = params.toString()
    const response = await api.get(`/reports/overview${qs ? `?${qs}` : ''}`)
    if (seq !== requestSeq) return
    data.value = response.data
  } catch (err) {
    if (seq !== requestSeq) return
    loadError.value = messageFor(err)
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

function applyRange() {
  loadReports()
}

onMounted(loadReports)

// A small local component so bar rows share one implementation across the
// four breakdown cards — plain tables and CSS width, no charting library.
const BreakdownTable = defineComponent({
  name: 'BreakdownTable',
  props: {
    buckets: { type: Array as PropType<CountBucket[]>, required: true },
    total: { type: Number, required: true },
    uncategorizedKey: { type: String, default: '' },
  },
  setup(props) {
    return () => h('table', { class: 'breakdown-table' }, [
      h('tbody', props.buckets.map(bucket => {
        const pct = props.total > 0 ? Math.round((bucket.count / props.total) * 100) : 0
        const isUncategorized = props.uncategorizedKey && bucket.key === props.uncategorizedKey
        const label = isUncategorized ? t('reports.uncategorized') : localizedName({ nameEn: bucket.labelEn, nameAr: bucket.labelAr })
        const hasFilter = Object.keys(bucket.filter).length > 0
        return h('tr', { key: bucket.key }, [
          h('td', hasFilter
            ? h(RouterLink, { to: { name: 'tickets', query: { ...bucket.filter } } }, () => label)
            : label),
          h('td', { class: 'count-cell' }, formatNumber(bucket.count)),
          h('td', { class: 'percent-cell' }, `${pct}%`),
          h('td', { class: 'bar-cell' }, h('div', { class: 'bar', style: { inlineSize: `${pct}%` } })),
        ])
      })),
    ])
  },
})
</script>

<style scoped>
.reports-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.range-row {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-3);
  flex-wrap: wrap;
}

.range-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.range-field input {
  padding: var(--spacing-2);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
}

.range-label {
  font-size: var(--font-size-sm);
  color: var(--color-gray-600);
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

.tiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: var(--spacing-4);
}

.tile {
  padding: var(--spacing-4);
  background-color: var(--color-gray-50);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-gray-200);
  text-align: center;
}

.tile-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.tile-label {
  font-size: var(--font-size-sm);
  color: var(--color-gray-600);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
  gap: var(--spacing-4);
}

:deep(.breakdown-table),
.workload-table {
  width: 100%;
  border-collapse: collapse;
}

:deep(.breakdown-table td),
.workload-table td,
.workload-table th {
  padding: var(--spacing-2) var(--spacing-1);
  border-bottom: 1px solid var(--color-gray-100);
  font-size: var(--font-size-sm);
}

.workload-table th {
  text-align: start;
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-700);
}

:deep(.count-cell),
.count-cell {
  text-align: end;
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

:deep(.percent-cell) {
  text-align: end;
  color: var(--color-gray-500);
  white-space: nowrap;
}

:deep(.bar-cell) {
  inline-size: 30%;
}

:deep(.bar) {
  block-size: 0.5rem;
  background-color: var(--color-primary);
  border-radius: var(--radius-full);
  min-inline-size: 2px;
}

.resolution-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: var(--spacing-4);
  text-align: center;
}

.stat-value {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-gray-600);
}
</style>
