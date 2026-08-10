<template>
  <span 
    class="status-badge" 
    :class="status"
    @click="onBadgeClick"
    :style="{ cursor: clickable ? 'pointer' : 'default' }"
  >
    {{ status }}
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    status: string;
    clickable?: boolean;
  }>(),
  {
    clickable: false
  }
);

const emit = defineEmits<{
  (e: 'filter-status', status: string): void;
}>();

function onBadgeClick() {
  if (props.clickable) {
    emit('filter-status', props.status);
  }
}
</script>
