<template>
  <div class="topbar">
    <div class="left">
      <button
        class="menu-button"
        :aria-label="menuButtonLabel"
        @click="appStore.toggleSidebar"
      >
        ☰
      </button>
      <h2 class="title">{{ t(currentPageTitle) }}</h2>
    </div>
    <div class="right">
      <LanguageSwitcher />
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app.store'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'

const { t } = useI18n()
const appStore = useAppStore()
const route = useRoute()

const currentPageTitle = computed(() => {
  return (route.meta.titleKey as string) || ''
})

const menuButtonLabel = computed(() => 'Toggle menu')
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4) var(--spacing-6);
  background-color: white;
  border-bottom: 1px solid var(--color-gray-200);
  box-shadow: var(--shadow-sm);
}

.left {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}

.menu-button {
  display: none;
  padding: var(--spacing-2) var(--spacing-3);
  background-color: transparent;
  border: none;
  font-size: var(--font-size-lg);
  cursor: pointer;
  color: var(--color-gray-700);
  transition: color var(--transition-base);
}

.menu-button:hover {
  color: var(--color-gray-900);
}

.title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-900);
}

.right {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}

@media (max-width: 768px) {
  .menu-button {
    display: block;
  }

  .topbar {
    padding: var(--spacing-3) var(--spacing-4);
  }

  .left {
    gap: var(--spacing-2);
  }

  .title {
    font-size: var(--font-size-base);
  }
}
</style>
