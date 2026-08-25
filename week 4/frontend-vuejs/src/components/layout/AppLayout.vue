<template>
  <div class="app-layout">
    <AppSidebar />
    <div class="main-area">
      <AppTopbar />
      <div class="content">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
import AppTopbar from './AppTopbar.vue'
import { RouterView } from 'vue-router'
</script>

<style scoped>
.app-layout {
  display: grid;
  grid-template-columns: auto 1fr;
  min-height: 100vh;
}

.main-area {
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-6);
}

@media (max-width: 768px) {
  .app-layout {
    grid-template-columns: 1fr;
  }

  .content {
    padding: var(--spacing-4);
  }
}
</style>
