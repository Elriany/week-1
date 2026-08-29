<template>
  <div class="admin-statuses">
    <div class="section-header">
      <h4>{{ t('admin.tabs.statuses') }}</h4>
    </div>

    <p class="hint">{{ t('admin.statuses.note') }}</p>

    <div v-if="loading" class="centered">
      <BaseSpinner />
    </div>

    <p v-else-if="loadError" class="error-text" role="alert">{{ loadError }}</p>

    <EmptyState
      v-else-if="rows.length === 0"
      :title="t('admin.empty.title')"
      :description="t('admin.empty.description')"
    />

    <div v-else class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t('admin.columns.code') }}</th>
            <th scope="col">{{ t('admin.columns.nameEn') }}</th>
            <th scope="col">{{ t('admin.columns.nameAr') }}</th>
            <th scope="col">{{ t('admin.columns.sortOrder') }}</th>
            <th scope="col">{{ t('admin.columns.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td><bdi class="mono">{{ row.code }}</bdi></td>
            <td>{{ row.nameEn }}</td>
            <td dir="rtl">{{ row.nameAr }}</td>
            <td>{{ row.sortOrder }}</td>
            <td>
              <BaseButton variant="secondary" size="sm" type="button" @click="openEdit(row)">
                {{ t('admin.actions.edit') }}
              </BaseButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseDialog :is-open="showForm" :title="t('admin.actions.edit')" @close="showForm = false">
      <form id="admin-status-form" class="dialog-form" novalidate @submit.prevent="submitForm">
        <label class="static-field">
          <span>{{ t('admin.columns.code') }}</span>
          <div class="static-value mono">{{ editing?.code }}</div>
        </label>

        <BaseInput v-model="form.nameEn" :label="t('admin.columns.nameEn')" required />
        <BaseInput v-model="form.nameAr" dir="rtl" :label="t('admin.columns.nameAr')" required />
        <BaseInput v-model="form.sortOrder" type="text" :label="t('admin.columns.sortOrder')" />

        <p v-if="formError" class="error-text" role="alert">{{ formError }}</p>
      </form>
      <template #footer>
        <BaseButton variant="secondary" size="md" type="button" @click="showForm = false">
          {{ t('admin.actions.cancel') }}
        </BaseButton>
        <BaseButton variant="primary" size="md" type="submit" form="admin-status-form" :loading="saving">
          {{ t('admin.actions.save') }}
        </BaseButton>
      </template>
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/api/client'
import { useApiError } from '@/composables/useApiError'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'

const KIND = 'statuses'

interface StatusRow {
  id: string
  code: string
  nameEn: string
  nameAr: string
  sortOrder: number
}

const { t } = useI18n()
const { messageFor } = useApiError()

const rows = ref<StatusRow[]>([])
const loading = ref(true)
let requestSeq = 0
const loadError = ref('')

const showForm = ref(false)
const editing = ref<StatusRow | null>(null)
const saving = ref(false)
const formError = ref('')
const form = reactive({ nameEn: '', nameAr: '', sortOrder: '0' })

async function loadRows() {
  const seq = ++requestSeq
  loading.value = true
  loadError.value = ''
  try {
    const response = await api.get(`/admin/reference/${KIND}`)
    if (seq !== requestSeq) return
    rows.value = response.data
  } catch (err) {
    if (seq !== requestSeq) return
    loadError.value = messageFor(err)
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

function openEdit(row: StatusRow) {
  editing.value = row
  formError.value = ''
  Object.assign(form, { nameEn: row.nameEn, nameAr: row.nameAr, sortOrder: String(row.sortOrder) })
  showForm.value = true
}

async function submitForm() {
  if (!editing.value) return
  formError.value = ''
  saving.value = true
  const sortOrder = Number(form.sortOrder)
  try {
    await api.patch(`/admin/reference/${KIND}/${editing.value.id}`, {
      nameEn: form.nameEn,
      nameAr: form.nameAr,
      sortOrder: Number.isNaN(sortOrder) ? undefined : sortOrder,
    })
    showForm.value = false
    await loadRows()
  } catch (err) {
    formError.value = messageFor(err)
  } finally {
    saving.value = false
  }
}

onMounted(loadRows)
</script>

<style scoped>
.admin-statuses {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
}

.section-header h4 {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}

.hint {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
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

.table-scroll {
  overflow-x: auto;
}


.mono {
  font-family: monospace;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.static-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-700);
}

.static-value {
  padding: var(--spacing-2) var(--spacing-3);
  background-color: var(--color-gray-100);
  border-radius: var(--radius-md);
  color: var(--color-gray-700);
}
</style>
