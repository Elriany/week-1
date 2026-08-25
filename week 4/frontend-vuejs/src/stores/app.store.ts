import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  const sidebarOpen = ref(true);
  const isLoading = ref(false);

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value;
  }

  function setSidebarOpen(open: boolean) {
    sidebarOpen.value = open;
  }

  return {
    sidebarOpen,
    isLoading,
    toggleSidebar,
    setSidebarOpen,
  };
});
