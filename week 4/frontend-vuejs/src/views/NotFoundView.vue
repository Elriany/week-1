<template>
  <div class="not-found-view">
    <EmptyState
      :title="t('errors.notFound')"
      :description="t('content.pageNotFoundDescription')"
    >
      <RouterLink :to="{ name: 'dashboard' }">
        <BaseButton variant="primary" size="md" type="button">
          {{ t('action.backToDashboard') }}
        </BaseButton>
      </RouterLink>
    </EmptyState>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import EmptyState from '@/components/ui/EmptyState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const { t } = useI18n()
</script>

<style scoped>
.not-found-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
}
</style>
