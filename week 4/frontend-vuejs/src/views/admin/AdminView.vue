<template>
  <div class="admin-view">
    <BaseCard>
      <template #header>
        <h3>{{ t('admin.title') }}</h3>
      </template>

      <p class="page-subtitle">{{ t('admin.subtitle') }}</p>

      <div class="tabs" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          role="tab"
          class="tab"
          :class="{ active: activeTab === tab.key }"
          :aria-selected="activeTab === tab.key"
          @click="activeTab = tab.key"
        >
          {{ t(tab.labelKey) }}
        </button>
      </div>

      <component :is="activeComponent" />
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseCard from '@/components/ui/BaseCard.vue'
import AdminBranches from '@/components/admin/AdminBranches.vue'
import AdminDepartments from '@/components/admin/AdminDepartments.vue'
import AdminCategories from '@/components/admin/AdminCategories.vue'
import AdminPriorities from '@/components/admin/AdminPriorities.vue'
import AdminStatuses from '@/components/admin/AdminStatuses.vue'

const { t } = useI18n()

const tabs = [
  { key: 'branches', labelKey: 'admin.tabs.branches', component: AdminBranches },
  { key: 'departments', labelKey: 'admin.tabs.departments', component: AdminDepartments },
  { key: 'categories', labelKey: 'admin.tabs.categories', component: AdminCategories },
  { key: 'priorities', labelKey: 'admin.tabs.priorities', component: AdminPriorities },
  { key: 'statuses', labelKey: 'admin.tabs.statuses', component: AdminStatuses },
] as const

const activeTab = ref<(typeof tabs)[number]['key']>('branches')

const activeComponent = computed(() => tabs.find(tab => tab.key === activeTab.value)?.component)
</script>

<style scoped>
.admin-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.tabs {
  display: flex;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-4);
  border-bottom: 1px solid var(--color-gray-200);
  flex-wrap: wrap;
}

.tab {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: var(--spacing-3) var(--spacing-4);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-600);
  cursor: pointer;
}

.tab:hover {
  color: var(--color-gray-900);
}

.tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}
</style>
