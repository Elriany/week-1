<template>
  <div :class="['sidebar', { mobile: isMobile && !appStore.sidebarOpen }]">
    <div v-if="isMobile && appStore.sidebarOpen" class="scrim" @click="appStore.setSidebarOpen(false)" />
    <nav class="nav">
      <div class="brand">
        <h1>AZM CRM</h1>
      </div>
      <ul class="nav-items">
        <li v-for="item in visibleNavItems" :key="item.name">
          <RouterLink
            :to="{ name: item.name }"
            class="nav-link"
            @click="handleNavClick"
          >
            <span class="icon">{{ item.icon }}</span>
            <span class="label">{{ t(item.titleKey) }}</span>
          </RouterLink>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'

interface NavItem {
  name: string
  titleKey: string
  icon: string
  /** When set, the link is hidden unless the signed-in user holds this permission. */
  permission?: string
}

const { t } = useI18n()
const appStore = useAppStore()
const auth = useAuthStore()
const route = useRoute()
const isMobile = ref(false)

const navItems: NavItem[] = [
  { name: 'dashboard', titleKey: 'nav.dashboard', icon: '📊' },
  { name: 'users', titleKey: 'nav.users', icon: '👥', permission: 'users.read' },
  { name: 'customers', titleKey: 'nav.customers', icon: '🧾', permission: 'customers.read' },
  { name: 'tickets', titleKey: 'nav.tickets', icon: '🎫', permission: 'tickets.read' },
  { name: 'roles', titleKey: 'nav.roles', icon: '🔑', permission: 'roles.read' },
  { name: 'about', titleKey: 'nav.about', icon: 'ℹ️' },
]

const visibleNavItems = computed(() =>
  navItems.filter(item => !item.permission || auth.can(item.permission)),
)

function handleNavClick() {
  if (isMobile.value) {
    appStore.setSidebarOpen(false)
  }
}

function checkMobile() {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  if (window.innerWidth < 768) {
    appStore.setSidebarOpen(false)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
.sidebar {
  width: 16rem;
  background-color: var(--color-gray-900);
  color: white;
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
  box-shadow: var(--shadow-lg);
  z-index: 40;
}

.brand {
  padding: var(--spacing-6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.brand h1 {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}

.nav {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-4) 0;
}

.nav-items {
  display: flex;
  flex-direction: column;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  color: rgba(255, 255, 255, 0.7);
  transition: all var(--transition-base);
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-link.router-link-active {
  background-color: var(--color-primary);
  color: white;
}

.icon {
  font-size: var(--font-size-lg);
}

.label {
  font-size: var(--font-size-sm);
}

/* Mobile styles */
@media (max-width: 768px) {
  .scrim {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 30;
  }

  .sidebar {
    position: fixed;
    height: 100vh;
    inset-inline-start: 0;
    inset-inline-end: auto;
    transition: transform var(--transition-base);
    z-index: 40;
  }

  .sidebar.mobile {
    transform: translateX(-100%);
  }
}
</style>
