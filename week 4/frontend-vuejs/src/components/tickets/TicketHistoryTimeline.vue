<template>
  <BaseCard>
    <template #header>
      <div class="card-header">
        <h3>{{ t('tickets.history.title') }}</h3>
      </div>
    </template>

    <div v-if="loading" class="centered">
      <BaseSpinner />
    </div>

    <p v-else-if="error" class="error-text" role="alert">{{ error }}</p>

    <EmptyState
      v-else-if="entries.length === 0"
      :title="t('tickets.history.empty.title')"
      :description="t('tickets.history.empty.description')"
    />

    <div v-else class="timeline">
      <div v-for="entry in entries" :key="`${entry.kind}-${entry.id}`" class="timeline-entry">
        <div class="timeline-icon">
          <span v-if="entry.kind === 'audit'">📝</span>
          <span v-else-if="entry.kind === 'note'">📄</span>
          <span v-else-if="entry.kind === 'attachment'">📎</span>
        </div>
        <div class="timeline-content">
          <div class="timeline-header">
            <strong>
              {{ entry.kind === 'audit' ? t('tickets.history.kind.audit') : entry.kind === 'note' ? t('tickets.history.kind.note') : t('tickets.history.kind.attachment') }}
            </strong>
            <span class="timestamp">{{ formatDateTime(entry.createdAt) }}</span>
          </div>
          <div v-if="entry.kind === 'audit'" class="timeline-body">
            {{ entry.actor?.fullNameEn || entry.actor?.fullNameAr || '—' }}: {{ entry.action }}<br />
            <span v-if="entry.fromValue || entry.toValue">{{ entry.fromValue }} → {{ entry.toValue }}</span>
            <div v-if="entry.note" class="timeline-note">{{ entry.note }}</div>
          </div>
          <div v-else-if="entry.kind === 'note'" class="timeline-body">
            {{ entry.actor?.fullNameEn || entry.actor?.fullNameAr || '—' }}<br />
            {{ truncateText(entry.body || '', 100) }}
          </div>
          <div v-else-if="entry.kind === 'attachment'" class="timeline-body">
            {{ entry.actor?.fullNameEn || entry.actor?.fullNameAr || '—' }}<br />
            {{ entry.fileName }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="entries.length > 0 && hasMore" class="load-more-container">
      <BaseButton variant="secondary" size="md" type="button" :loading="loadingMore" @click="$emit('loadMore')">
        {{ t('tickets.history.loadMore') }}
      </BaseButton>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useFormat } from '@/composables/useFormat'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

interface Person {
  id: string
  fullNameEn: string
  fullNameAr: string
}

interface HistoryEntry {
  id: string
  kind: 'audit' | 'note' | 'attachment'
  createdAt: Date
  actor?: Person
  action?: string
  fromValue?: string
  toValue?: string
  note?: string
  body?: string
  fileName?: string
}

withDefaults(
  defineProps<{
    entries: HistoryEntry[]
    loading: boolean
    error: string
    hasMore: boolean
    loadingMore?: boolean
  }>(),
  { loadingMore: false },
)

defineEmits<{
  (e: 'loadMore'): void
}>()

const { t } = useI18n()
const { formatDateTime } = useFormat()

function truncateText(text: string, length: number): string {
  return text.length > length ? text.substring(0, length) + '…' : text
}
</script>

<style scoped>
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

.timeline {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.timeline-entry {
  display: flex;
  gap: var(--spacing-3);
}

.timeline-icon {
  font-size: var(--font-size-lg);
  line-height: 1;
}

.timeline-content {
  flex: 1;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
}

.timestamp {
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
}

.timeline-body {
  margin-top: var(--spacing-1);
  font-size: var(--font-size-sm);
  color: var(--color-gray-700);
  line-height: 1.6;
}

.timeline-note {
  margin-top: var(--spacing-1);
  font-style: italic;
  color: var(--color-gray-600);
}

.load-more-container {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-4);
}
</style>
