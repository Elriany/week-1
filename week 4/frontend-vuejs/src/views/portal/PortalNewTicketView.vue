<template>
  <div class="portal-new-ticket-view">
    <BaseCard :title="t('portal.form.subject')">
      <template #header>
        <div class="card-header">
          <h3>{{ t('portal.newRequest') }}</h3>
          <RouterLink :to="{ name: 'portal-tickets' }">{{ t('portal.backToList') }}</RouterLink>
        </div>
      </template>

      <div v-if="success" class="success-state">
        <strong>{{ t('portal.form.successTitle') }}</strong>
        <p>{{ t('portal.form.successBody', { number: createdNumber }) }}</p>
      </div>

      <form v-else class="dialog-form" novalidate @submit.prevent="submit">
        <BaseInput v-model="form.subject" :label="t('portal.form.subject')" :error="fieldErrors.subject" required />

        <label class="textarea-field">
          <span>{{ t('portal.form.description') }}</span>
          <textarea v-model="form.description" class="textarea-input" required></textarea>
          <span v-if="fieldErrors.description" class="error">{{ fieldErrors.description }}</span>
        </label>

        <label class="select-field">
          <span>{{ t('portal.form.category') }}</span>
          <select v-model="form.categoryId">
            <option value="">{{ t('tickets.create.selectCategory') }}</option>
            <option v-for="category in meta.categories" :key="category.id" :value="category.id">
              {{ localizedName(category) }}
            </option>
          </select>
        </label>

        <label class="select-field">
          <span>{{ t('portal.form.priority') }}</span>
          <select v-model="form.priorityCode">
            <option v-for="priority in priorityOptions" :key="priority.code" :value="priority.code">
              {{ priority.label }}
            </option>
          </select>
        </label>

        <p v-if="formError" class="error-text" role="alert">{{ formError }}</p>

        <div class="form-actions">
          <BaseButton variant="primary" size="md" type="submit" :loading="submitting" :disabled="submitting">
            {{ t('portal.form.submit') }}
          </BaseButton>
        </div>
      </form>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'
import { useLocalizedName } from '@/composables/useLocalizedName'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'

interface Category {
  id: string
  code: string
  nameEn: string
  nameAr: string
}

interface Priority {
  id: string
  code: string
  nameEn: string
  nameAr: string
}

const PRIORITY_CODES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const

const { t } = useI18n()
const router = useRouter()
const localizedName = useLocalizedName()

const meta = reactive<{ categories: Category[]; priorities: Priority[] }>({ categories: [], priorities: [] })
const form = reactive({ subject: '', description: '', categoryId: '', priorityCode: 'MEDIUM' })

const submitting = ref(false)
const formError = ref('')
const fieldErrors = ref<{ subject?: string; description?: string }>({})
const success = ref(false)
const createdNumber = ref('')

const priorityOptions = computed(() =>
  PRIORITY_CODES.map(code => {
    const apiPriority = meta.priorities.find(p => p.code === code)
    return { code, label: apiPriority ? localizedName(apiPriority) : t(`portal.priority.${code}`) }
  }),
)

function validate(): boolean {
  const errors: { subject?: string; description?: string } = {}
  const subject = form.subject.trim()
  const description = form.description.trim()
  if (subject.length < 1 || subject.length > 300) errors.subject = t('portal.form.subject')
  if (description.length < 1 || description.length > 4000) errors.description = t('portal.form.description')
  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

/** Zod's flattened issue shape, as the API returns it in `error.details`. */
type ZodFieldErrors = Record<string, { _errors?: string[] } | undefined>

function mapValidationDetails(details: unknown): { subject?: string; description?: string } {
  const out: { subject?: string; description?: string } = {}
  if (details && typeof details === 'object') {
    for (const key of ['subject', 'description'] as const) {
      const message = (details as ZodFieldErrors)[key]?._errors?.[0]
      if (typeof message === 'string' && message) out[key] = message
    }
  }
  return out
}

async function loadMeta() {
  try {
    const response = await api.get('/portal/meta')
    meta.categories = response.data.categories
    meta.priorities = response.data.priorities
  } catch {
    // The form still submits with an empty category and the localized priority-code fallback.
  }
}

async function submit() {
  if (submitting.value) return
  formError.value = ''
  fieldErrors.value = {}
  if (!validate()) return

  submitting.value = true
  try {
    const response = await api.post('/portal/tickets', {
      subject: form.subject.trim(),
      description: form.description.trim(),
      categoryId: form.categoryId || null,
      priorityCode: form.priorityCode,
    })
    createdNumber.value = response.data.ticketNumber
    success.value = true
    setTimeout(() => {
      router.push({ name: 'portal-ticket-detail', params: { id: response.data.id } })
    }, 1200)
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 422) {
        fieldErrors.value = mapValidationDetails(err.details)
        formError.value = err.serverMessage ?? t('errors.unreachable')
      } else if (err.status === 409) {
        formError.value = t('portal.form.configError')
      } else {
        formError.value = err.serverMessage ?? t('errors.unreachable')
      }
    } else {
      formError.value = t('errors.unreachable')
    }
  } finally {
    submitting.value = false
  }
}

onMounted(loadMeta)
</script>

<style scoped>
.portal-new-ticket-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
}

.card-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.textarea-field,
.select-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-700);
}

.textarea-input {
  min-height: 8rem;
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--font-size-base);
  resize: vertical;
}

.select-field select {
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-family: inherit;
}

.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  font-weight: normal;
}

.error-text {
  margin: 0;
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}

.form-actions {
  display: flex;
  gap: var(--spacing-2);
}

.success-state {
  padding: var(--spacing-4);
  background-color: var(--color-success-50);
  border: 1px solid var(--color-success-200);
  border-radius: var(--radius-md);
  color: var(--color-success-dark);
  line-height: 1.6;
}
</style>
