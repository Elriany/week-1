<template>
  <div class="roles-view">
    <BaseCard :title="t('roles.title')">
      <div v-if="loading" class="centered">
        <BaseSpinner />
      </div>

      <p v-else-if="loadError" class="error-text" role="alert">{{ loadError }}</p>

      <EmptyState
        v-else-if="roles.length === 0"
        :title="t('roles.empty.title')"
        :description="t('roles.empty.description')"
      />

      <div v-else class="role-list">
        <article v-for="role in roles" :key="role.id" class="role">
          <header>
            <h4>{{ localizedName(role) }}</h4>
            <BaseBadge variant="primary" :label="role.code" />
          </header>
          <div class="permissions">
            <BaseBadge
              v-for="code in role.permissions"
              :key="code"
              variant="gray"
              :label="code"
            />
            <span v-if="role.permissions.length === 0" class="muted">
              {{ t('roles.noPermissions') }}
            </span>
          </div>
        </article>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'
import { useLocalizedName } from '@/composables/useLocalizedName'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

interface RoleRow {
  id: string
  code: string
  nameEn: string
  nameAr: string
  permissions: string[]
}

const { t } = useI18n()
const localizedName = useLocalizedName()

const roles = ref<RoleRow[]>([])
const loading = ref(false)
const loadError = ref('')

onMounted(async () => {
  loading.value = true
  try {
    const response = await api.get('/users/roles')
    roles.value = response.data
  } catch (err) {
    loadError.value =
      err instanceof ApiError && err.status === 403
        ? t('errors.forbidden')
        : t('errors.unreachable')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.roles-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.centered {
  display: flex;
  justify-content: center;
  padding: var(--spacing-8);
}

.error-text {
  margin: 0;
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}

.role-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.role {
  padding: var(--spacing-4);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
}

.role header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-3);
}

.role h4 {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-900);
}

.permissions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.muted {
  font-size: var(--font-size-sm);
  color: var(--color-gray-600);
}
</style>
