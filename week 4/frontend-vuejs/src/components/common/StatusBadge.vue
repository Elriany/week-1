<template>
  <span :class="['badge', badgeClass]">
    <i v-if="icon" :class="['pi', icon]" style="margin-right: 0.25rem; font-size: 0.75rem;"></i>
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  status: string;
}>();

const badgeClass = computed(() => {
  switch (props.status) {
    case 'APPROVED':
    case 'ACTIVE':
      return 'badge-success';
    case 'PENDING_MANAGER':
    case 'PENDING_ADMIN':
    case 'PENDING':
    case 'PENDING_ACTIVATION':
    case 'PENDING_DEACTIVATION':
    case 'RESUBMITTED':
      return 'badge-warning';
    case 'REJECTED':
    case 'INACTIVE':
      return 'badge-danger';
    case 'DRAFT':
    case 'CANCELLED':
    default:
      return 'badge-neutral';
  }
});

const label = computed(() => {
  return props.status?.replace(/_/g, ' ') || 'UNKNOWN';
});

const icon = computed(() => {
  switch (props.status) {
    case 'APPROVED':
    case 'ACTIVE':
      return 'pi-check-circle';
    case 'PENDING_MANAGER':
    case 'PENDING_ADMIN':
    case 'PENDING':
    case 'PENDING_ACTIVATION':
    case 'PENDING_DEACTIVATION':
      return 'pi-clock';
    case 'REJECTED':
    case 'INACTIVE':
      return 'pi-times-circle';
    case 'RESUBMITTED':
      return 'pi-refresh';
    case 'CANCELLED':
      return 'pi-ban';
    case 'DRAFT':
      return 'pi-pencil';
    default:
      return '';
  }
});
</script>
