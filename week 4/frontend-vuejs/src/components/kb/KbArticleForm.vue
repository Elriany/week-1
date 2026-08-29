<template>
  <BaseDialog :is-open="true" :title="isEdit ? t('kb.article.edit') : t('kb.newArticle')" @close="$emit('close')">
    <form id="kb-article-form" class="dialog-form" novalidate @submit.prevent="submit">
      <BaseInput v-model="form.titleEn" :label="t('kb.form.titleEn')" :error="fieldError('titleEn')" required />
      <BaseInput v-model="form.titleAr" dir="rtl" :label="t('kb.form.titleAr')" :error="fieldError('titleAr')" required />

      <label class="textarea-field">
        <span>{{ t('kb.form.bodyEn') }}</span>
        <textarea v-model="form.bodyEn" class="textarea-input" required></textarea>
        <span v-if="fieldError('bodyEn')" class="error">{{ fieldError('bodyEn') }}</span>
      </label>

      <label class="textarea-field">
        <span>{{ t('kb.form.bodyAr') }}</span>
        <textarea v-model="form.bodyAr" dir="rtl" class="textarea-input" required></textarea>
        <span v-if="fieldError('bodyAr')" class="error">{{ fieldError('bodyAr') }}</span>
      </label>

      <label class="select-field">
        <span>{{ t('kb.form.category') }}</span>
        <select v-model="form.categoryId">
          <option value="">{{ t('kb.form.noCategory') }}</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ localizedName(category) }}
          </option>
        </select>
      </label>

      <BaseInput
        v-model="sortOrderText"
        type="text"
        :label="t('kb.form.sortOrder')"
        :error="fieldError('sortOrder')"
      />

      <p v-if="formError" class="error-text" role="alert">{{ formError }}</p>
    </form>
    <template #footer>
      <BaseButton variant="secondary" size="md" type="button" @click="$emit('close')">
        {{ t('kb.form.cancel') }}
      </BaseButton>
      <BaseButton variant="primary" size="md" type="submit" form="kb-article-form" :loading="saving">
        {{ t('kb.form.save') }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'
import { useLocalizedName } from '@/composables/useLocalizedName'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

interface Category {
  id: string
  code: string
  nameEn: string
  nameAr: string
}

interface ArticleDetail {
  id: string
  categoryId: string | null
  titleEn: string
  titleAr: string
  bodyEn: string
  bodyAr: string
  sortOrder: number
}

const props = defineProps<{
  categories: Category[]
  article?: ArticleDetail | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', article: unknown): void
}>()

const { t } = useI18n()
const localizedName = useLocalizedName()

const isEdit = computed(() => Boolean(props.article))

const form = reactive({
  titleEn: props.article?.titleEn ?? '',
  titleAr: props.article?.titleAr ?? '',
  bodyEn: props.article?.bodyEn ?? '',
  bodyAr: props.article?.bodyAr ?? '',
  categoryId: props.article?.categoryId ?? '',
})
const sortOrderText = ref(String(props.article?.sortOrder ?? 0))

const saving = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})

function fieldError(field: string): string {
  return fieldErrors.value[field] ?? ''
}

/** Zod's flattened issue shape, as the API returns it in `error.details`. */
type ZodFieldErrors = Record<string, { _errors?: string[] } | undefined>

function mapValidationDetails(details: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (details && typeof details === 'object') {
    for (const [key, value] of Object.entries(details as ZodFieldErrors)) {
      const message = value?._errors?.[0]
      if (typeof message === 'string' && message) out[key] = message
    }
  }
  return out
}

async function submit() {
  formError.value = ''
  fieldErrors.value = {}
  saving.value = true

  const payload: Record<string, unknown> = {
    titleEn: form.titleEn,
    titleAr: form.titleAr,
    bodyEn: form.bodyEn,
    bodyAr: form.bodyAr,
    categoryId: form.categoryId || null,
  }
  const sortOrder = Number(sortOrderText.value)
  if (!Number.isNaN(sortOrder)) payload.sortOrder = sortOrder

  try {
    const response = isEdit.value
      ? await api.patch(`/kb/articles/${props.article!.id}`, payload)
      : await api.post('/kb/articles', payload)
    emit('saved', response.data)
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 422) {
        fieldErrors.value = mapValidationDetails(err.details)
        formError.value = err.serverMessage ?? t('errors.unreachable')
      } else if (err.status === 403) {
        formError.value = t('errors.forbidden')
      } else {
        formError.value = err.serverMessage ?? t('errors.unreachable')
      }
    } else {
      formError.value = t('errors.unreachable')
    }
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
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
  white-space: pre-wrap;
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
</style>
