<template>
  <div class="dashboard-view">
    <div v-if="showDenied" class="denied-banner" role="status">
      <span>{{ t('nav.deniedBanner') }}</span>
      <button type="button" class="dismiss" @click="showDenied = false">
        {{ t('nav.dismiss') }}
      </button>
    </div>

    <div v-if="loading" class="centered">
      <BaseSpinner />
    </div>

    <p v-else-if="loadError" class="error-text" role="alert">{{ loadError }}</p>

    <template v-else-if="data">
      <div class="header-row">
        <h2>{{ t('dashboard.title') }}</h2>
        <BaseButton variant="secondary" size="sm" type="button" @click="loadDashboard">
          {{ t('dashboard.refresh') }}
        </BaseButton>
      </div>

      <div class="tiles-grid">
        <RouterLink :to="ticketsLinkFor(data.myOpen.filter)" class="tile">
          <div class="tile-value">{{ formatNumber(data.myOpen.count) }}</div>
          <div class="tile-label">{{ t('dashboard.myOpen') }}</div>
        </RouterLink>
        <RouterLink :to="ticketsLinkFor(data.myBreached.filter)" class="tile tile-danger">
          <div class="tile-value">{{ formatNumber(data.myBreached.count) }}</div>
          <div class="tile-label">{{ t('dashboard.myBreached') }}</div>
        </RouterLink>
        <RouterLink :to="ticketsLinkFor(data.unassigned.filter)" class="tile">
          <div class="tile-value">{{ formatNumber(data.unassigned.count) }}</div>
          <div class="tile-label">{{ t('dashboard.unassigned') }}</div>
        </RouterLink>
        <RouterLink :to="ticketsLinkFor(data.branchOpen.filter)" class="tile">
          <div class="tile-value">{{ formatNumber(data.branchOpen.count) }}</div>
          <div class="tile-label">{{ t('dashboard.branchOpen') }}</div>
        </RouterLink>
      </div>

      <div class="cards-grid">
        <BaseCard :title="t('dashboard.section.byStatus')">
          <table class="bucket-table">
            <tbody>
              <tr v-for="bucket in data.myByStatus" :key="bucket.key">
                <td>{{ bucketLabel(bucket) }}</td>
                <td class="count-cell">
                  <RouterLink v-if="hasFilter(bucket.filter)" :to="ticketsLinkFor(bucket.filter)">
                    {{ formatNumber(bucket.count) }}
                  </RouterLink>
                  <span v-else>{{ formatNumber(bucket.count) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </BaseCard>

        <BaseCard :title="t('dashboard.section.byPriority')">
          <table class="bucket-table">
            <tbody>
              <tr v-for="bucket in data.myByPriority" :key="bucket.key">
                <td>{{ bucketLabel(bucket) }}</td>
                <td class="count-cell">
                  <RouterLink v-if="hasFilter(bucket.filter)" :to="ticketsLinkFor(bucket.filter)">
                    {{ formatNumber(bucket.count) }}
                  </RouterLink>
                  <span v-else>{{ formatNumber(bucket.count) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </BaseCard>

        <BaseCard :title="t('dashboard.section.sla')">
          <table class="bucket-table">
            <tbody>
              <tr v-for="bucket in data.slaBuckets" :key="bucket.key">
                <td>
                  <SlaBadge :sla="{ status: bucket.key as SlaStatus }" />
                </td>
                <td class="count-cell">
                  <RouterLink v-if="hasFilter(bucket.filter)" :to="ticketsLinkFor(bucket.filter)">
                    {{ formatNumber(bucket.count) }}
                  </RouterLink>
                  <span v-else>{{ formatNumber(bucket.count) }}</span>
                </td>
              </tr>
              <tr v-if="data.slaNoPolicyCount > 0" class="no-policy-row">
                <td>{{ t('dashboard.sla.noPolicy') }}</td>
                <td class="count-cell">{{ formatNumber(data.slaNoPolicyCount) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="data.slaNoPolicyCount > 0" class="hint">{{ t('dashboard.sla.noPolicyHint') }}</p>
        </BaseCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
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

interface DashboardData {
  myOpen: { count: number; filter: Record<string, string> }
  myBreached: { count: number; filter: Record<string, string> }
  unassigned: { count: number; filter: Record<string, string> }
  branchOpen: { count: number; filter: Record<string, string> }
  myByStatus: CountBucket[]
  myByPriority: CountBucket[]
  slaBuckets: CountBucket[]
  slaNoPolicyCount: number
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

// The guard redirects here with ?denied=1 when a permission check fails. Show
// it once, then strip the query so a reload does not repeat it. The flag is a
// fixed value, never echoed back into the page.
const showDenied = ref(route.query.denied === '1')
if (showDenied.value) {
  router.replace({ name: 'dashboard', query: {} })
}
const { formatNumber } = useFormat()
const localizedName = useLocalizedName()
const { messageFor } = useApiError()

const data = ref<DashboardData | null>(null)
const loading = ref(true)
const loadError = ref('')
let requestSeq = 0

function bucketLabel(bucket: CountBucket): string {
  return localizedName({ nameEn: bucket.labelEn, nameAr: bucket.labelAr })
}

function hasFilter(filter: Record<string, string>): boolean {
  return Object.keys(filter).length > 0
}

/** The backend's `filter` object is spread verbatim — never re-keyed, re-cased,
 * or extended, or a tile and the list it links to would silently drift apart. */
function ticketsLinkFor(filter: Record<string, string>) {
  return { name: 'tickets', query: { ...filter } }
}

async function loadDashboard() {
  const seq = ++requestSeq
  loading.value = true
  loadError.value = ''
  try {
    const response = await api.get('/dashboard/agent')
    if (seq !== requestSeq) return
    data.value = response.data
  } catch (err) {
    if (seq !== requestSeq) return
    loadError.value = messageFor(err)
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

onMounted(loadDashboard)
</script>

<style scoped>
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-row h2 {
  margin: 0;
  font-size: var(--font-size-xl);
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

.tiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: var(--spacing-4);
}

.tile {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  background-color: var(--color-gray-50);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-gray-200);
  text-align: center;
  transition: all var(--transition-base);
}

.tile:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-50);
}

.tile-danger .tile-value {
  color: var(--color-danger);
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
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: var(--spacing-4);
}

.bucket-table {
  width: 100%;
  border-collapse: collapse;
}

.bucket-table td {
  padding: var(--spacing-2) var(--spacing-1);
  border-bottom: 1px solid var(--color-gray-100);
  font-size: var(--font-size-sm);
}

.count-cell {
  text-align: end;
  font-weight: var(--font-weight-semibold);
}

.no-policy-row {
  color: var(--color-gray-500);
}

.hint {
  margin: var(--spacing-2) 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
}
.denied-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  margin-block-end: var(--spacing-4);
  padding: var(--spacing-3) var(--spacing-4);
  background-color: var(--color-warning-50);
  border: 1px solid var(--color-warning-200);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}

.dismiss {
  background: none;
  border: none;
  color: var(--color-gray-700);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-decoration: underline;
}
</style>
