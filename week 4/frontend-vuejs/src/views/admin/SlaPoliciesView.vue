<template>
  <div class="sla-policies-view">
    <BaseCard>
      <template #header>
        <h3>{{ t('sla.title') }}</h3>
      </template>

      <p class="page-subtitle">{{ t('admin.slaSubtitle') }}</p>

      <p class="hint">{{ t('sla.wallClockNote') }}</p>

      <div v-if="loading" class="centered">
        <BaseSpinner />
      </div>

      <p v-else-if="loadError" class="error-text" role="alert">{{ loadError }}</p>

      <div v-else class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col">{{ t('sla.columns.priority') }}</th>
              <th scope="col">{{ t('sla.columns.responseTarget') }}</th>
              <th scope="col">{{ t('sla.columns.resolutionTarget') }}</th>
              <th scope="col">{{ t('sla.columns.active') }}</th>
              <th scope="col">{{ t('admin.columns.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in policies" :key="row.priorityId">
              <td>{{ row.priority ? localizedName(row.priority) : '—' }}</td>
              <td>{{ formatNumber(row.responseTargetMinutes) }} {{ minutesHint(row.responseTargetMinutes) }}</td>
              <td>{{ formatNumber(row.resolutionTargetMinutes) }} {{ minutesHint(row.resolutionTargetMinutes) }}</td>
              <td>
                <BaseBadge :variant="row.isActive ? 'success' : 'gray'" :label="row.isActive ? t('users.status.active') : t('users.status.inactive')" />
              </td>
              <td>
                <BaseButton variant="secondary" size="sm" type="button" @click="openEdit(row)">
                  {{ t('admin.actions.edit') }}
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <BaseDialog :is-open="showForm" :title="editing ? localizedName(editing.priority ?? {}) : ''" @close="showForm = false">
      <form id="sla-policy-form" class="dialog-form" novalidate @submit.prevent="submitForm">
        <BaseInput
          v-model="form.responseTargetMinutes"
          type="text"
          :label="t('sla.form.responseTargetMinutes')"
          required
        />
        <BaseInput
          v-model="form.resolutionTargetMinutes"
          type="text"
          :label="t('sla.form.resolutionTargetMinutes')"
          :error="fieldError"
          required
        />
        <label class="checkbox-field">
          <input v-model="form.isActive" type="checkbox" />
          {{ t('sla.form.isActive') }}
        </label>

        <p v-if="formError" class="error-text" role="alert">{{ formError }}</p>
      </form>
      <template #footer>
        <BaseButton variant="secondary" size="md" type="button" @click="showForm = false">
          {{ t('sla.form.cancel') }}
        </BaseButton>
        <BaseButton variant="primary" size="md" type="submit" form="sla-policy-form" :loading="saving">
          {{ t('sla.form.save') }}
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
import { useLocalizedName } from '@/composables/useLocalizedName'
import { useFormat } from '@/composables/useFormat'
import { useApiError } from '@/composables/useApiError'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'

interface PriorityRef {
  id: string
  code: string
  nameEn: string
  nameAr: string
}

interface SlaPolicyRow {
  id: string
  priorityId: string
  priority: PriorityRef | null
  responseTargetMinutes: number
  resolutionTargetMinutes: number
  isActive: boolean
}

const { t } = useI18n()
const localizedName = useLocalizedName()
const { formatNumber } = useFormat()
const { messageFor } = useApiError()

const policies = ref<SlaPolicyRow[]>([])
const loading = ref(true)
const loadError = ref('')

const showForm = ref(false)
const editing = ref<SlaPolicyRow | null>(null)
const saving = ref(false)
const formError = ref('')
const fieldError = ref('')
const form = reactive({ responseTargetMinutes: '', resolutionTargetMinutes: '', isActive: true })

function minutesHint(minutes: number): string {
  if (minutes < 60) return ''
  const hours = Math.round((minutes / 60) * 10) / 10
  return t('sla.minutesHint', { hours: formatNumber(hours) })
}

let requestSeq = 0
async function loadPolicies() {
  const seq = ++requestSeq
  loading.value = true
  loadError.value = ''
  try {
    const response = await api.get('/sla/policies')
    if (seq !== requestSeq) return
    policies.value = response.data
  } catch (err) {
    if (seq !== requestSeq) return
    loadError.value = messageFor(err)
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

function openEdit(row: SlaPolicyRow) {
  editing.value = row
  formError.value = ''
  fieldError.value = ''
  Object.assign(form, {
    responseTargetMinutes: String(row.responseTargetMinutes),
    resolutionTargetMinutes: String(row.resolutionTargetMinutes),
    isActive: row.isActive,
  })
  showForm.value = true
}

async function submitForm() {
  if (!editing.value) return
  formError.value = ''
  fieldError.value = ''

  const responseTargetMinutes = Number(form.responseTargetMinutes)
  const resolutionTargetMinutes = Number(form.resolutionTargetMinutes)

  // Mirrors Story 16's server-side `.refine` — convenience only, the server re-checks.
  if (resolutionTargetMinutes < responseTargetMinutes) {
    fieldError.value = t('sla.errors.resolutionBelowResponse')
    return
  }

  saving.value = true
  try {
    await api.put(`/sla/policies/${editing.value.priorityId}`, {
      responseTargetMinutes,
      resolutionTargetMinutes,
      isActive: form.isActive,
    })
    showForm.value = false
    await loadPolicies()
  } catch (err) {
    if (err instanceof ApiError && err.status === 422) {
      fieldError.value = t('sla.errors.resolutionBelowResponse')
    } else {
      formError.value = messageFor(err)
    }
  } finally {
    saving.value = false
  }
}

onMounted(loadPolicies)
</script>

<style scoped>
.sla-policies-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.hint {
  margin: 0 0 var(--spacing-4);
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


.dialog-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
}
</style>
