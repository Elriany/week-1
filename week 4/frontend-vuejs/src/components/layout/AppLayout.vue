<template>
  <div class="app-container">
    <AppSidebar />
    <div class="main-content">
      <AppTopbar />
      <main class="page-body">
        <slot></slot>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppSidebar from './AppSidebar.vue';
import AppTopbar from './AppTopbar.vue';
</script>
