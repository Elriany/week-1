import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  const sidebarOpen = ref(true);
  const isLoading = ref(false);
  /**
   * Label for the current record on a detail screen, so the breadcrumb can read
   * "Tickets / TKT-000123" rather than "Tickets / Tickets". A detail view sets
   * it once the record loads and clears it on unmount — a stale value would
   * show the previous record's name on the next screen.
   */
  const breadcrumbItemLabel = ref('');

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value;
  }

  function setSidebarOpen(open: boolean) {
    sidebarOpen.value = open;
  }

  function setBreadcrumbItemLabel(label: string) {
    breadcrumbItemLabel.value = label;
  }

  return {
    sidebarOpen,
    isLoading,
    breadcrumbItemLabel,
    toggleSidebar,
    setSidebarOpen,
    setBreadcrumbItemLabel,
  };
});
