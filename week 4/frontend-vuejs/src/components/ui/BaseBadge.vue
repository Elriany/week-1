<template>
  <span :class="['base-badge', `variant-${variant}`]">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import type { BadgeVariant } from '@/types/ui'

interface Props {
  variant?: BadgeVariant
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
  /* Pill radius, so a status badge is visually distinct from a button. */
  border-radius: var(--radius-full);
  /* On a white card a filled pastel with no edge reads as a smudge; the
     border is what makes a column of badges scan. */
  border: 1px solid transparent;
  white-space: nowrap;
}

.variant-primary {
  background-color: var(--badge-primary-bg);
  color: var(--badge-primary-fg);
  border-color: var(--badge-primary-border);
}

.variant-info {
  background-color: var(--badge-info-bg);
  color: var(--badge-info-fg);
  border-color: var(--badge-info-border);
}

.variant-success {
  background-color: var(--badge-success-bg);
  color: var(--badge-success-fg);
  border-color: var(--badge-success-border);
}

.variant-danger {
  background-color: var(--badge-danger-bg);
  color: var(--badge-danger-fg);
  border-color: var(--badge-danger-border);
}

.variant-warning {
  background-color: var(--badge-warning-bg);
  color: var(--badge-warning-fg);
  border-color: var(--badge-warning-border);
}

.variant-gray {
  background-color: var(--badge-gray-bg);
  color: var(--badge-gray-fg);
  border-color: var(--badge-gray-border);
}
</style>
