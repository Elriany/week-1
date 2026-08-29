<template>
  <nav v-if="parent" class="breadcrumb" :aria-label="t('nav.breadcrumbLabel')">
    <ol>
      <li>
        <!-- A parent the user cannot open renders as plain text: admin-sla is
             gated on sla.manage while its parent admin needs admin.manage, so
             a link there would bounce them straight back. -->
        <RouterLink v-if="parentReachable" :to="{ name: parent.name }">
          {{ t(parent.titleKey) }}
        </RouterLink>
        <span v-else>{{ t(parent.titleKey) }}</span>
      </li>
      <li aria-current="page">{{ currentLabel }}</li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const auth = useAuthStore()

const parent = computed(() => {
  const name = route.meta.parent
  if (!name) return null
  const record = router.getRoutes().find(r => r.name === name)
  if (!record?.meta.titleKey) return null
  return { name, titleKey: record.meta.titleKey, permission: record.meta.permission }
})

const parentReachable = computed(() => {
  const permission = parent.value?.permission
  return !permission || auth.can(permission)
})

/** Falls back to the route's own title so the trail never ends in a blank
 *  segment while the record is still loading. */
const currentLabel = computed(
  () => appStore.breadcrumbItemLabel || (route.meta.titleKey ? t(route.meta.titleKey) : ''),
)
</script>

<style scoped>
.breadcrumb ol {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin: 0;
  padding: 0;
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.breadcrumb li {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

/* Logical separator, so it points the right way in Arabic. */
.breadcrumb li + li::before {
  content: '/';
  color: var(--color-gray-400);
}

[dir='rtl'] .breadcrumb li + li::before {
  content: '\\';
}

.breadcrumb li[aria-current='page'] {
  color: var(--color-gray-700);
  font-weight: var(--font-weight-medium);
}

@media (max-width: 768px) {
  /* The topbar already carries the menu button, title, language switcher,
     account name, role badge and sign-out at this width. */
  .breadcrumb {
    display: none;
  }
}
</style>
