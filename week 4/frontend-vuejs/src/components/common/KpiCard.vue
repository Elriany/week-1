<template>
  <div class="kpi-card" :class="`variant-${variant || 'primary'}`">
    <div class="kpi-icon-wrap">
      <i :class="['pi', icon]"></i>
    </div>
    <div class="kpi-body">
      <span class="kpi-title">{{ title }}</span>
      <span class="kpi-value">{{ value }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  value: number | string;
  icon: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}>();
</script>

<style scoped>
.kpi-card {
  background: var(--surface-0);
  border-radius: var(--radius-md);
  border: 1px solid var(--surface-200);
  box-shadow: var(--shadow-sm);
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.kpi-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.variant-primary .kpi-icon-wrap { background: #e0e7ff; color: #4f46e5; }
.variant-success .kpi-icon-wrap { background: #dcfce7; color: #15803d; }
.variant-warning .kpi-icon-wrap { background: #fef9c3; color: #a16207; }
.variant-danger .kpi-icon-wrap  { background: #fee2e2; color: #b91c1c; }
.variant-info .kpi-icon-wrap    { background: #e0f2fe; color: #0369a1; }

.kpi-body {
  display: flex;
  flex-direction: column;
}

.kpi-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.kpi-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--surface-900);
  margin-top: 0.125rem;
}
</style>
