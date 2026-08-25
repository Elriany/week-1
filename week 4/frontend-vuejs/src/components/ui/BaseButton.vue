<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading"
    :class="[
      'base-button',
      `variant-${variant}`,
      `size-${size}`,
      { disabled, loading },
    ]"
  >
    <BaseSpinner v-if="loading" :size="size === 'sm' ? 'xs' : 'sm'" />
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseSpinner from './BaseSpinner.vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  disabled: false,
  loading: false,
})
</script>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
  white-space: nowrap;
}

/* Sizes */
.size-sm {
  padding: var(--spacing-2) var(--spacing-3);
  font-size: var(--font-size-sm);
}

.size-md {
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--font-size-base);
}

.size-lg {
  padding: var(--spacing-3) var(--spacing-6);
  font-size: var(--font-size-lg);
}

/* Variants */
.variant-primary {
  background-color: var(--color-primary);
  color: white;
}

.variant-primary:hover:not(.disabled) {
  background-color: var(--color-primary-dark);
}

.variant-secondary {
  background-color: var(--color-gray-200);
  color: var(--color-gray-900);
}

.variant-secondary:hover:not(.disabled) {
  background-color: var(--color-gray-300);
}

.variant-danger {
  background-color: var(--color-danger);
  color: white;
}

.variant-danger:hover:not(.disabled) {
  background-color: #991b1b;
}

.variant-ghost {
  background-color: transparent;
  color: var(--color-primary);
}

.variant-ghost:hover:not(.disabled) {
  background-color: var(--color-gray-100);
}

/* Disabled state */
.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Loading state */
.loading {
  pointer-events: none;
}
</style>
