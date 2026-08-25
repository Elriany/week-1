<template>
  <div class="empty-state">
    <div class="icon">📭</div>
    <h3 v-if="title" class="title">{{ title }}</h3>
    <p v-if="description" class="description">{{ description }}</p>
    <div v-if="$slots.default" class="action">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string
  description?: string
}

withDefaults(defineProps<Props>(), {})
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-12);
  text-align: center;
}

.icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-4);
}

.title {
  margin: 0 0 var(--spacing-2) 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-900);
}

.description {
  margin: 0 0 var(--spacing-4) 0;
  color: var(--color-gray-600);
  font-size: var(--font-size-sm);
}

.action {
  display: flex;
  gap: var(--spacing-2);
  justify-content: center;
}
</style>
