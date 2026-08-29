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
import BaseSpinner from './BaseSpinner.vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
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
  /* Nothing in the reset clears the user-agent button border, so without this
     every button renders the browser default around its fill. Transparent
     keeps the box model identical to .variant-secondary, which shows one. */
  border: 1px solid transparent;
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
  border-color: var(--color-gray-300);
}

.variant-secondary:hover:not(.disabled) {
  background-color: var(--color-gray-300);
}

.variant-danger {
  background-color: var(--color-danger);
  color: white;
}

.variant-danger:hover:not(.disabled) {
  background-color: var(--color-danger-dark);
}

.variant-ghost {
  background-color: transparent;
  color: var(--color-primary);
  border-color: transparent;
}

.variant-ghost:hover:not(.disabled) {
  background-color: var(--color-primary-50);
}

/* Disabled state. opacity: 0.5 over a blue fill drops white text to roughly
   2:1; these explicit colours are 6.10:1. Doubled class beats the variant
   rules on specificity. */
.base-button.disabled,
.base-button.disabled:hover {
  background-color: var(--color-gray-200);
  color: var(--color-gray-600);
  border-color: var(--color-gray-300);
  cursor: not-allowed;
}

/* Loading state */
.loading {
  pointer-events: none;
}
</style>
