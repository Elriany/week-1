<template>
  <div class="base-card">
    <div v-if="$slots.header || title" class="header">
      <slot name="header">
        <h3>{{ title }}</h3>
      </slot>
    </div>
    <div class="content">
      <slot />
    </div>
    <div v-if="$slots.footer" class="footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string
}

withDefaults(defineProps<Props>(), {})
</script>

<style scoped>
.base-card {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.header {
  padding: var(--spacing-4);
  border-bottom: 1px solid var(--color-gray-200);
}

.header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-900);
}

.content {
  padding: var(--spacing-4);
}

.footer {
  padding: var(--spacing-4);
  border-top: 1px solid var(--color-gray-200);
  display: flex;
  gap: var(--spacing-2);
}
</style>
