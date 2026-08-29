<template>
  <BaseCard>
    <template #header>
      <div class="card-header">
        <h3>{{ t(`${i18nPrefix}.title`) }}</h3>
        <BaseButton
          v-if="canUpload"
          variant="primary"
          size="md"
          type="button"
          @click="showUploadForm = !showUploadForm"
        >
          {{ t(`${i18nPrefix}.upload`) }}
        </BaseButton>
      </div>
    </template>

    <div v-if="loading" class="centered">
      <BaseSpinner />
    </div>

    <p v-else-if="error" class="error-text" role="alert">{{ error }}</p>

    <div v-if="canUpload && showUploadForm" class="upload-form">
      <p class="upload-info">
        {{ t(`${i18nPrefix}.maxSize`, { size: '5 MB' }) }}<br />
        {{ t(`${i18nPrefix}.allowedTypes`) }}
      </p>
      <form class="form" @submit.prevent="submitUpload">
        <input ref="fileInput" type="file" class="file-input" @change="handleFileSelect" />
        <p v-if="uploadError" class="error-text">{{ uploadError }}</p>
        <div class="form-actions">
          <BaseButton variant="primary" size="md" type="submit" :loading="uploading" :disabled="!selectedFile">
            {{ t('common.save') }}
          </BaseButton>
          <BaseButton variant="secondary" size="md" type="button" @click="showUploadForm = false">
            {{ t('common.cancel') }}
          </BaseButton>
        </div>
      </form>
    </div>

    <EmptyState
      v-if="attachments.length === 0"
      :title="t(`${i18nPrefix}.empty.title`)"
      :description="t(`${i18nPrefix}.empty.description`)"
    />

    <div v-else class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t(`${i18nPrefix}.columns.name`) }}</th>
            <th scope="col">{{ t(`${i18nPrefix}.columns.size`) }}</th>
            <th scope="col">{{ t(`${i18nPrefix}.columns.uploader`) }}</th>
            <th scope="col">{{ t(`${i18nPrefix}.columns.date`) }}</th>
            <th scope="col">{{ t(`${i18nPrefix}.columns.actions`) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in attachments" :key="row.id">
            <td><bdi>{{ row.originalName }}</bdi></td>
            <td>{{ formatNumber(Number(row.sizeBytes)) }} bytes</td>
            <td>{{ row.uploader ? displayName(row.uploader) : '—' }}</td>
            <td>{{ formatDate(row.createdAt) }}</td>
            <td>
              <div class="actions">
                <BaseButton variant="secondary" size="sm" type="button" @click="$emit('download', row)">
                  {{ t(`${i18nPrefix}.download`) }}
                </BaseButton>
                <BaseButton
                  v-if="canUpload"
                  variant="danger"
                  size="sm"
                  type="button"
                  @click="$emit('delete', row)"
                >
                  {{ t(`${i18nPrefix}.delete`) }}
                </BaseButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { useFormat } from '@/composables/useFormat'
import { useApiError } from '@/composables/useApiError'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

interface Person {
  id: string
  fullNameEn: string
  fullNameAr: string
}

interface Attachment {
  id: string
  originalName: string
  sizeBytes: number
  createdAt: Date
  uploader: Person | null
}

const props = withDefaults(defineProps<{
  attachments: Attachment[]
  loading: boolean
  error: string
  canUpload: boolean
  /** Endpoint the file is POSTed to, e.g. `/tickets/:id/attachments`. Required when `canUpload` is true. */
  uploadEndpoint?: string
  /**
   * i18n namespace for this panel's strings. `tickets.attachments.*` and
   * `customers.attachments.*` have identical key sets, so one component reads
   * a prefix rather than carrying two copies of the same markup.
   */
  i18nPrefix?: string
}>(), {
  i18nPrefix: 'tickets.attachments',
})

const emit = defineEmits<{
  (e: 'uploaded'): void
  (e: 'download', attachment: Attachment): void
  (e: 'delete', attachment: Attachment): void
}>()

const { t } = useI18n()
const i18nPrefix = computed(() => props.i18nPrefix)
const localizedName = useLocalizedName()
const { formatDate, formatNumber } = useFormat()
const { messageFor: messageForBase } = useApiError()

function displayName(person: Person): string {
  return localizedName({ nameEn: person.fullNameEn, nameAr: person.fullNameAr })
}

const showUploadForm = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const uploading = ref(false)
const uploadError = ref('')

const ERROR_OVERRIDES = { 413: `${props.i18nPrefix}.errors.tooLarge` }
function messageFor(err: unknown): string {
  if (err instanceof ApiError && err.status === 400 && (err.details as Record<string, unknown> | undefined)?.file) {
    return t(`${props.i18nPrefix}.errors.unsupportedType`)
  }
  return messageForBase(err, ERROR_OVERRIDES)
}

function handleFileSelect() {
  selectedFile.value = fileInput.value?.files?.[0] || null
}

async function submitUpload() {
  if (!selectedFile.value || !props.uploadEndpoint) return
  uploadError.value = ''
  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    await api.upload(props.uploadEndpoint, formData)
    showUploadForm.value = false
    selectedFile.value = null
    if (fileInput.value) fileInput.value.value = ''
    emit('uploaded')
  } catch (err) {
    uploadError.value = messageFor(err)
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
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

.upload-form {
  padding: var(--spacing-3);
  margin-bottom: var(--spacing-4);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  background-color: var(--color-gray-50);
}

.upload-info {
  margin: 0 0 var(--spacing-3);
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.form-actions {
  display: flex;
  gap: var(--spacing-2);
}

.table-scroll {
  overflow-x: auto;
}


.actions {
  display: flex;
  gap: var(--spacing-2);
  white-space: normal;
}
</style>
