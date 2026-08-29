<template>
  <div class="admin-branches">
    <div class="section-header">
      <h4>{{ t('admin.branches.title') }}</h4>
      <BaseButton v-if="isAdmin" variant="primary" size="md" type="button" @click="openCreate">
        {{ t('admin.actions.new') }}
      </BaseButton>
    </div>

    <p v-if="!isAdmin" class="hint">{{ t('admin.branches.adminOnlyNote') }}</p>

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
            <th scope="col">{{ t('admin.columns.active') }}</th>
            <th scope="col" v-if="isAdmin">{{ t('admin.columns.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td><bdi class="mono">{{ row.code }}</bdi></td>
            <td>{{ row.nameEn }}</td>
            <td dir="rtl">{{ row.nameAr }}</td>
            <td>
              <BaseBadge :variant="row.isActive ? 'success' : 'gray'" :label="row.isActive ? t('users.status.active') : t('users.status.inactive')" />
            </td>
            <td v-if="isAdmin">
              <div class="actions">
                <BaseButton variant="secondary" size="sm" type="button" @click="openEdit(row)">
                  {{ t('admin.actions.edit') }}
                </BaseButton>
                <BaseButton
                  :variant="row.isActive ? 'secondary' : 'primary'"
                  size="sm"
                  type="button"
                  :loading="pendingId === row.id"
                  @click="row.isActive ? confirmDeactivate(row) : toggleActive(row)"
                >
                  {{ row.isActive ? t('admin.actions.deactivate') : t('admin.actions.activate') }}
                </BaseButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseDialog :is-open="showForm" :title="editing ? t('admin.actions.edit') : t('admin.actions.new')" @close="showForm = false">
      <form id="admin-branch-form" class="dialog-form" novalidate @submit.prevent="submitForm">
        <label v-if="editing" class="static-field">
          <span>{{ t('admin.columns.code') }}</span>
          <div class="static-value mono">{{ editing.code }}</div>
        </label>
        <BaseInput v-else v-model="form.code" :label="t('admin.columns.code')" :error="fieldErrors.code" required />

        <BaseInput v-model="form.nameEn" :label="t('admin.columns.nameEn')" required />
        <BaseInput v-model="form.nameAr" dir="rtl" :label="t('admin.columns.nameAr')" required />

        <p v-if="formError" class="error-text" role="alert">{{ formError }}</p>
      </form>
      <template #footer>
        <BaseButton variant="secondary" size="md" type="button" @click="showForm = false">
          {{ t('admin.actions.cancel') }}
        </BaseButton>
        <BaseButton variant="primary" size="md" type="submit" form="admin-branch-form" :loading="saving">
          {{ t('admin.actions.save') }}
        </BaseButton>
      </template>
    </BaseDialog>

    <BaseDialog :is-open="showDeactivate.show" :title="t('admin.actions.confirmDeactivate')" @close="showDeactivate.show = false">
      <p class="delete-message">{{ showDeactivate.row?.code }}</p>
      <p v-if="deactivateError" class="error-text" role="alert">{{ deactivateError }}</p>
      <template #footer>
        <BaseButton variant="secondary" size="md" type="button" @click="showDeactivate.show = false">
          {{ t('admin.actions.cancel') }}
        </BaseButton>
        <BaseButton variant="danger" size="md" type="button" :loading="pendingId === showDeactivate.row?.id" @click="confirmedDeactivate">
          {{ t('admin.actions.deactivate') }}
        </BaseButton>
      </template>
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'
import { useAuthStore } from '@/stores/auth.store'
import { useApiError } from '@/composables/useApiError'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'

interface BranchRow {
  id: string
  code: string
  nameEn: string
  nameAr: string
  isActive: boolean
}

const { t } = useI18n()
const auth = useAuthStore()
const { messageFor } = useApiError()

const isAdmin = auth.roleCode === 'ADMIN'

const rows = ref<BranchRow[]>([])
const loading = ref(true)
let requestSeq = 0
const loadError = ref('')
const pendingId = ref<string | null>(null)

const showForm = ref(false)
const editing = ref<BranchRow | null>(null)
const saving = ref(false)
const formError = ref('')
const fieldErrors = reactive({ code: '' })
const form = reactive({ code: '', nameEn: '', nameAr: '' })

const showDeactivate = reactive<{ show: boolean; row: BranchRow | null }>({ show: false, row: null })
const deactivateError = ref('')

async function loadRows() {
  const seq = ++requestSeq
  loading.value = true
  loadError.value = ''
  try {
    const response = await api.get('/admin/branches?includeInactive=true')
    if (seq !== requestSeq) return
    rows.value = response.data
  } catch (err) {
    if (seq !== requestSeq) return
    loadError.value = messageFor(err)
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

function openCreate() {
  editing.value = null
  formError.value = ''
  fieldErrors.code = ''
  Object.assign(form, { code: '', nameEn: '', nameAr: '' })
  showForm.value = true
}

function openEdit(row: BranchRow) {
  editing.value = row
  formError.value = ''
  fieldErrors.code = ''
  Object.assign(form, { code: row.code, nameEn: row.nameEn, nameAr: row.nameAr })
  showForm.value = true
}

async function submitForm() {
  formError.value = ''
  fieldErrors.code = ''
  saving.value = true
  try {
    if (editing.value) {
      await api.patch(`/admin/branches/${editing.value.id}`, { nameEn: form.nameEn, nameAr: form.nameAr })
    } else {
      await api.post('/admin/branches', { code: form.code, nameEn: form.nameEn, nameAr: form.nameAr })
    }
    showForm.value = false
    await loadRows()
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      // The duplicate-code refusal belongs on the field it names, not the banner.
      fieldErrors.code = t('admin.errors.duplicateCode')
    } else {
      formError.value = messageFor(err)
    }
  } finally {
    saving.value = false
  }
}

async function toggleActive(row: BranchRow) {
  pendingId.value = row.id
  try {
    await api.patch(`/admin/branches/${row.id}/active`, { isActive: true })
    await loadRows()
  } catch (err) {
    loadError.value = messageFor(err)
  } finally {
    pendingId.value = null
  }
}

function confirmDeactivate(row: BranchRow) {
  showDeactivate.row = row
  showDeactivate.show = true
  deactivateError.value = ''
}

async function confirmedDeactivate() {
  if (!showDeactivate.row) return
  pendingId.value = showDeactivate.row.id
  deactivateError.value = ''
  try {
    await api.patch(`/admin/branches/${showDeactivate.row.id}/active`, { isActive: false })
    showDeactivate.show = false
    await loadRows()
  } catch (err) {
    deactivateError.value = messageFor(err, { 409: 'admin.errors.branchInUse' })
  } finally {
    pendingId.value = null
  }
}

onMounted(loadRows)
</script>

<style scoped>
.admin-branches {
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

.actions {
  display: flex;
  gap: var(--spacing-2);
  white-space: normal;
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

.delete-message {
  padding: var(--spacing-3);
  background-color: var(--color-danger-50);
  border-inline-start: 4px solid var(--color-danger);
  border-radius: var(--radius-sm);
  color: var(--color-danger);
  margin: 0 0 var(--spacing-3);
  font-size: var(--font-size-sm);
}
</style>
