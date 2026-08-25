<template>
  <div class="dashboard-view">
    <div class="grid-container">
      <BaseCard :title="t('section.welcome')">
        <p>{{ t('content.welcome.description') }}</p>
        <BaseButton variant="primary" size="md" type="button">
          {{ t('action.getStarted') }}
        </BaseButton>
      </BaseCard>

      <BaseCard :title="t('section.features')">
        <div class="features-list">
          <div v-for="feature in features" :key="feature" class="feature-item">
            <BaseBadge variant="success" :label="t(feature)" />
          </div>
        </div>
      </BaseCard>

      <BaseCard :title="t('section.quickStats')">
        <div class="stats-grid">
          <div class="stat">
            <div class="stat-value">12</div>
            <div class="stat-label">{{ t('status.activeTickets') }}</div>
          </div>
          <div class="stat">
            <div class="stat-value">5</div>
            <div class="stat-label">{{ t('status.totalUsers') }}</div>
          </div>
        </div>
      </BaseCard>

      <BaseCard :title="t('section.nextSteps')">
        <ol class="steps-list">
          <li>{{ t('step.setupAccount') }}</li>
          <li>{{ t('step.configureTeam') }}</li>
          <li>{{ t('step.exploreFeatures') }}</li>
        </ol>
      </BaseCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'

const { t } = useI18n()

const features = [
  'feature.ticketManagement',
  'feature.customerTracking',
  'feature.analyticsReports',
  'feature.teamCollaboration',
]
</script>

<style scoped>
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
  gap: var(--spacing-4);
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.feature-item {
  display: flex;
  align-items: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-4);
}

.stat {
  text-align: center;
  padding: var(--spacing-4);
  background-color: var(--color-gray-50);
  border-radius: var(--radius-md);
}

.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: var(--spacing-2);
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-gray-600);
}

.steps-list {
  margin: 0;
  padding-inline-start: var(--spacing-6);
}

.steps-list li {
  margin-bottom: var(--spacing-2);
  color: var(--color-gray-700);
}

@media (max-width: 768px) {
  .grid-container {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
