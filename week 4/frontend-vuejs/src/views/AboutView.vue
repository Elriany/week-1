<template>
  <div class="about-view">
    <BaseCard :title="t('section.about')">
      <p>{{ t('content.about.description') }}</p>
    </BaseCard>

    <BaseCard :title="t('section.systemHealth')">
      <div v-if="loading" class="loading-state">
        <BaseSpinner />
        <p>{{ t('status.loading') }}</p>
      </div>

      <div v-else-if="error" class="error-state">
        <div class="error-badge">
          <BaseBadge variant="danger" :label="error" />
        </div>
        <BaseButton variant="secondary" size="md" type="button" @click="fetchHealth">
          {{ t('common.retry') }}
        </BaseButton>
      </div>

      <div v-else-if="healthData" class="health-state">
        <div class="health-item">
          <span class="label">{{ t('status.status') }}</span>
          <BaseBadge variant="success" :label="healthData.status" />
        </div>
        <div class="health-item">
          <span class="label">{{ t('info.timestamp') }}</span>
          <span class="value">{{ formatTimestamp(healthData.timestamp) }}</span>
        </div>
        <div class="health-item">
          <span class="label">{{ t('info.environment') }}</span>
          <span class="value">{{ healthData.environment || 'unknown' }}</span>
        </div>
      </div>

      <EmptyState
        v-else
        :title="t('status.noData')"
        :description="t('content.noDataAvailable')"
      >
        <BaseButton variant="primary" size="md" type="button" @click="fetchHealth">
          {{ t('action.loadData') }}
        </BaseButton>
      </EmptyState>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/api/client'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useFormat } from '@/composables/useFormat'

const { t } = useI18n()
const { formatDateTime } = useFormat()

interface HealthData {
  status: string
  timestamp: string
  environment?: string
}

const loading = ref(false)
const error = ref<string | null>(null)
const healthData = ref<HealthData | null>(null)

async function fetchHealth() {
  loading.value = true
  error.value = null
  try {
    const response = await api.get('/health')
    healthData.value = {
      status: response.status || 'ok',
      timestamp: new Date().toISOString(),
      environment: response.environment,
    }
  } catch (err) {
    error.value = t('errors.unreachable')
  } finally {
    loading.value = false
  }
}

function formatTimestamp(timestamp: string): string {
  return formatDateTime(timestamp)
}

onMounted(() => {
  fetchHealth()
})
</script>

<style scoped>
.about-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-8);
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-8);
}

.error-badge {
  width: 100%;
  display: flex;
  justify-content: center;
}

.health-state {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.health-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4);
  background-color: var(--color-gray-50);
  border-radius: var(--radius-md);
}

.label {
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-700);
}

.value {
  color: var(--color-gray-600);
  font-family: monospace;
  font-size: var(--font-size-sm);
}
</style>
