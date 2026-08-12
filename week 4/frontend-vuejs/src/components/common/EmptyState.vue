<template>
  <div class="empty-state">
    <div class="empty-icon">
      <i :class="['pi', icon || 'pi-inbox']"></i>
    </div>
    <h3 class="empty-title">{{ title }}</h3>
    <p class="empty-message">{{ message }}</p>
    <div v-if="$slots.action" class="empty-action">
      <slot name="action"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  message: string;
  icon?: string;
}>();
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 3rem 1.5rem;
  background: var(--surface-0);
  border: 1px dashed var(--surface-300);
  border-radius: var(--radius-md);
  margin: 1.5rem 0;
}

.empty-icon {
  font-size: 2.5rem;
  color: var(--surface-300);
  margin-bottom: 0.75rem;
}

.empty-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--surface-900);
}

.empty-message {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.empty-action {
  margin-top: 1.25rem;
}
</style>
