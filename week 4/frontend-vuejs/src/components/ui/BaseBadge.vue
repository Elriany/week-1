<template>
  <span :class="['base-badge', `variant-${variant}`]">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'info' | 'success' | 'danger' | 'warning' | 'gray'
  label: string
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
})
</script>

<style scoped>
.base-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-1) var(--spacing-2);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.variant-primary {
  background-color: #dbeafe;
  color: #1e40af;
}

.variant-info {
  background-color: #dbeafe;
  color: #1e40af;
}

.variant-success {
  background-color: #dcfce7;
  color: #166534;
}

.variant-danger {
  background-color: var(--color-danger-light);
  color: #991b1b;
}

.variant-warning {
  background-color: #fed7aa;
  color: #92400e;
}

.variant-gray {
  background-color: var(--color-gray-200);
  color: var(--color-gray-700);
}
</style>
