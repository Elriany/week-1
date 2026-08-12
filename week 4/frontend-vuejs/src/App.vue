<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth.store';

const authStore = useAuthStore();

onMounted(() => {
  if (authStore.token && !authStore.user) {
    authStore.fetchCurrentUser();
  }
});
</script>
