<template>
  <BaseCard :title="t('customers.history.title')">
    <div v-if="loading && entries.length === 0" class="centered">
      <BaseSpinner />
    </div>

    <p v-else-if="loadError" class="error-text" role="alert">{{ loadError }}</p>

    <EmptyState
      v-else-if="entries.length === 0"
      :title="t('customers.history.empty.title')"
      :description="t('customers.history.empty.description')"
    />

    <template v-else>
      <ul class="timeline">
        <li v-for="entry in entries" :key="`${entry.kind}-${entry.id}`" class="entry">
          <BaseBadge :variant="kindVariant(entry.kind)" :label="kindLabel(entry.kind)" />
          <div class="entry-body">
            <RouterLink
              v-if="entry.kind === 'ticket'"
              :to="{ name: 'ticket-detail', params: { id: entry.id } }"
              class="entry-title"
            >
              {{ entry.title }}
            </RouterLink>
            <span v-else class="entry-title">{{ entry.title }}</span>

            <div class="entry-meta">
              <bdi v-if="entry.reference" class="mono">{{ entry.reference }}</bdi>
              <span v-if="statusLabel(entry)">{{ statusLabel(entry) }}</span>
              <span>{{ actorName(entry) }}</span>
              <span>{{ formatDateTime(entry.occurredAt) }}</span>
            </div>
          </div>
        </li>
      </ul>

      <div v-if="entries.length < total" class="load-more">
        <BaseButton variant="secondary" size="md" type="button" :loading="loading" @click="loadMore">
          {{ t('customers.history.loadMore') }}
        </BaseButton>
      </div>
    </template>
  </BaseCard>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@/api/client'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { useFormat } from '@/composables/useFormat'
import { useApiError } from '@/composables/useApiError'
import type { BadgeVariant } from '@/types/ui'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const PAGE_SIZE = 20

interface HistoryEntry {
  kind: string
  id: string
  occurredAt: Date
  title: string
  reference: string | null
  statusEn: string | null
  statusAr: string | null
  actor: { id: string; fullNameEn: string; fullNameAr: string } | null
}

const props = defineProps<{ customerId: string }>()

const { t, te } = useI18n()
const localizedName = useLocalizedName()
const { formatDateTime } = useFormat()
const { messageFor } = useApiError()

const entries = ref<HistoryEntry[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const loadError = ref('')

let requestSeq = 0

const KIND_VARIANTS: Record<string, BadgeVariant> = {
  ticket: 'info',
  note: 'gray',
  attachment: 'success',
}

function kindVariant(kind: string): BadgeVariant {
  return KIND_VARIANTS[kind] ?? 'gray'
}

/** An unknown kind shows its raw code rather than a raw translation key. */
function kindLabel(kind: string): string {
  const key = `customers.history.kind.${kind}`
  return te(key) ? t(key) : kind
}

function statusLabel(entry: HistoryEntry): string {
  if (!entry.statusEn && !entry.statusAr) return ''
  return localizedName({ nameEn: entry.statusEn ?? '', nameAr: entry.statusAr ?? '' })
}

/** A ticket filed through the public web form has no actor. */
function actorName(entry: HistoryEntry): string {
  if (!entry.actor) return '—'
  return localizedName({ nameEn: entry.actor.fullNameEn, nameAr: entry.actor.fullNameAr })
}

async function load(targetPage: number) {
  const seq = ++requestSeq
  loading.value = true
  loadError.value = ''
  try {
    const response = await api.get(
      `/customers/${props.customerId}/history?page=${targetPage}&pageSize=${PAGE_SIZE}`,
    )
    if (seq !== requestSeq) return
    const rows = response.data.items.map((e: Omit<HistoryEntry, 'occurredAt'> & { occurredAt: string }) => ({
      ...e,
      occurredAt: new Date(e.occurredAt),
    }))
    entries.value = targetPage === 1 ? rows : [...entries.value, ...rows]
    total.value = response.data.total
    page.value = targetPage
  } catch (err) {
    if (seq !== requestSeq) return
    loadError.value = messageFor(err)
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

function loadMore() {
  load(page.value + 1)
}

onMounted(() => load(1))
watch(() => props.customerId, () => load(1))
</script>

<style scoped>
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

.timeline {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.entry {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-3);
  padding-block-end: var(--spacing-3);
  border-block-end: 1px solid var(--color-gray-100);
}

.entry:last-child {
  border-block-end: none;
  padding-block-end: 0;
}

.entry-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.entry-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-900);
}

.entry-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-3);
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
}

.mono {
  font-family: monospace;
}

.load-more {
  display: flex;
  justify-content: center;
  margin-block-start: var(--spacing-4);
}
</style>
