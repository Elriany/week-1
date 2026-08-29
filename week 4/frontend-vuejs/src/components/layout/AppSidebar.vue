<template>
  <div :class="['sidebar', { mobile: isMobile && !appStore.sidebarOpen }]">
    <div v-if="isMobile && appStore.sidebarOpen" class="scrim" @click="appStore.setSidebarOpen(false)" />
    <nav class="nav" :aria-label="t('app.title')">
      <div class="brand">
        <h1>{{ t('app.title') }}</h1>
      </div>
      <ul v-for="group in visibleGroups" :key="group.key" class="nav-items">
        <li class="nav-group-heading" role="presentation">{{ t(group.titleKey) }}</li>
        <li v-for="item in group.items" :key="item.name">
          <RouterLink
            v-slot="{ isActive }"
            :to="{ name: item.name }"
            class="nav-link"
            @click="handleNavClick"
          >
            <span class="icon" aria-hidden="true">{{ item.icon }}</span>
            <span class="label" :aria-current="isActive ? 'page' : undefined">
              {{ t(item.titleKey) }}
            </span>
          </RouterLink>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'

type NavGroup = 'work' | 'knowledge' | 'admin'

interface NavItem {
  name: string
  titleKey: string
  icon: string
  group: NavGroup
  /** When set, the link is hidden unless the signed-in user holds this permission. */
  permission?: string
  /** Display concern only — restricts the link to these role codes. */
  roles?: string[]
  /** Display concern only — hides the link for these role codes. */
  excludeRoles?: string[]
}

const NAV_GROUPS: { key: NavGroup; titleKey: string }[] = [
  { key: 'work', titleKey: 'nav.groups.work' },
  { key: 'knowledge', titleKey: 'nav.groups.knowledge' },
  { key: 'admin', titleKey: 'nav.groups.admin' },
]

const { t } = useI18n()
const appStore = useAppStore()
const auth = useAuthStore()
const isMobile = ref(false)

const navItems: NavItem[] = [
  { name: 'dashboard', titleKey: 'nav.dashboard', icon: '📊', group: 'work', excludeRoles: ['CUSTOMER'] },
  { name: 'portal-tickets', titleKey: 'nav.myTickets', icon: '🎟️', group: 'work', roles: ['CUSTOMER'] },
  { name: 'portal-new-ticket', titleKey: 'nav.newRequest', icon: '✉️', group: 'work', roles: ['CUSTOMER'] },
  { name: 'users', titleKey: 'nav.users', icon: '👥', group: 'admin', permission: 'users.read' },
  { name: 'customers', titleKey: 'nav.customers', icon: '🧾', group: 'work', permission: 'customers.read' },
  { name: 'tickets', titleKey: 'nav.tickets', icon: '🎫', group: 'work', permission: 'tickets.read', excludeRoles: ['CUSTOMER'] },
  { name: 'reports', titleKey: 'nav.reports', icon: '📈', group: 'knowledge', permission: 'reports.read' },
  { name: 'kb', titleKey: 'nav.kb', icon: '📚', group: 'knowledge', permission: 'kb.read' },
  { name: 'roles', titleKey: 'nav.roles', icon: '🔑', group: 'admin', permission: 'roles.read' },
  { name: 'admin', titleKey: 'nav.admin', icon: '⚙️', group: 'admin', permission: 'admin.manage' },
  { name: 'admin-sla', titleKey: 'nav.sla', icon: '⏱️', group: 'admin', permission: 'sla.manage' },
  { name: 'audit', titleKey: 'nav.audit', icon: '📜', group: 'admin', permission: 'audit.read' },
]

const visibleNavItems = computed(() =>
  navItems.filter(item =>
    (!item.permission || auth.can(item.permission)) &&
    (!item.roles || item.roles.includes(auth.roleCode)) &&
    (!item.excludeRoles || !item.excludeRoles.includes(auth.roleCode)),
  ),
)

/** Built from the FILTERED list, never from navItems: this is the only thing
 *  keeping a CUSTOMER out of the staff links, so grouping must not bypass it.
 *  A heading with nothing under it reads as a broken menu, hence the filter. */
const visibleGroups = computed(() =>
  NAV_GROUPS.map(g => ({ ...g, items: visibleNavItems.value.filter(i => i.group === g.key) }))
    .filter(g => g.items.length > 0),
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

.nav-items + .nav-items {
  margin-block-start: var(--spacing-4);
}

.nav-group-heading {
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-gray-400);
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
    transform: translateX(calc(-100% * var(--drawer-direction, 1)));
  }
}
</style>
