<template>
  <div :class="['base-spinner', `size-${size}`]" aria-hidden="true" />
</template>

<script setup lang="ts">
interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

withDefaults(defineProps<Props>(), {
  size: 'md',
})
</script>

<style scoped>
.base-spinner {
  display: inline-block;
  border: 2px solid var(--color-gray-200);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.size-xs {
  width: 1rem;
  height: 1rem;
}

.size-sm {
  width: 1.25rem;
  height: 1.25rem;
}

.size-md {
  width: 1.5rem;
  height: 1.5rem;
}

.size-lg {
  width: 2rem;
  height: 2rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-spinner {
    animation: none;
    border-top-color: var(--color-gray-200);
    opacity: 0.6;
  }
}
</style>
