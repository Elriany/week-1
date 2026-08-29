<template>
  <BaseCard>
    <template #header>
      <div class="card-header">
        <h3>{{ t('tickets.notes.title') }}</h3>
        <BaseButton
          v-if="canAddNote"
          variant="primary"
          size="md"
          type="button"
          @click="$emit('open-create')"
        >
          {{ t('tickets.notes.add') }}
        </BaseButton>
      </div>
    </template>

    <div v-if="loading" class="centered">
      <BaseSpinner />
    </div>

    <p v-else-if="error" class="error-text" role="alert">{{ error }}</p>

    <EmptyState
      v-else-if="notes.length === 0"
      :title="t('tickets.notes.empty.title')"
      :description="t('tickets.notes.empty.description')"
    />

    <div v-else class="notes-list">
      <article
        v-for="note in notes"
        :key="note.id"
        class="note"
        :class="{ internal: note.isInternal }"
      >
        <div class="note-header">
          <div class="note-title">
            <strong>{{ note.author ? displayName(note.author) : '—' }}</strong>
            <BaseBadge v-if="note.isInternal" variant="info" :label="t('tickets.notes.internal')" />
          </div>
          <span class="timestamp">{{ formatDateTime(note.createdAt) }}</span>
        </div>
        <div class="note-body" v-html="escapeHtml(note.body)"></div>
        <div v-if="canEdit(note)" class="note-actions">
          <BaseButton variant="secondary" size="sm" type="button" @click="$emit('edit', note)">
            {{ t('tickets.notes.edit') }}
          </BaseButton>
          <BaseButton variant="danger" size="sm" type="button" @click="$emit('delete', note)">
            {{ t('tickets.notes.delete') }}
          </BaseButton>
        </div>
      </article>
    </div>

    <BaseCard v-if="creating" :title="t('tickets.notes.add')">
      <form class="form" @submit.prevent="$emit('submit-create')">
        <label class="select-field">
          <span>{{ t('common.note') }}</span>
          <!-- `form` is a shared reactive object owned by the parent; the child edits it in place by design. -->
          <!-- eslint-disable-next-line vue/no-mutating-props -->
          <textarea v-model="form.body"
            class="note-input"
            :placeholder="t('tickets.notes.placeholder')"
            required
          ></textarea>
        </label>
        <label v-if="allowInternalToggle" class="checkbox">
          <!-- eslint-disable-next-line vue/no-mutating-props -->
          <input v-model="form.isInternal" type="checkbox" />
          {{ t('tickets.notes.internal') }}
        </label>
        <p v-if="formError" class="error-text">{{ formError }}</p>
        <div class="form-actions">
          <BaseButton variant="primary" size="md" type="submit" :loading="saving">
            {{ t('common.save') }}
          </BaseButton>
          <BaseButton variant="secondary" size="md" type="button" @click="$emit('cancel-create')">
            {{ t('common.cancel') }}
          </BaseButton>
        </div>
      </form>
    </BaseCard>
  </BaseCard>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { useFormat } from '@/composables/useFormat'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

interface Person {
  id: string
  fullNameEn: string
  fullNameAr: string
}

interface Note {
  id: string
  ticketId: string
  body: string
  isInternal: boolean
  createdAt: Date
  author: Person | null
}

withDefaults(
  defineProps<{
    notes: Note[]
    loading: boolean
    error: string
    canAddNote: boolean
    allowInternalToggle?: boolean
    canEdit: (note: Note) => boolean
    creating: boolean
    form: { body: string; isInternal: boolean }
    formError: string
    saving: boolean
  }>(),
  { allowInternalToggle: true },
)

defineEmits<{
  (e: 'open-create'): void
  (e: 'submit-create'): void
  (e: 'cancel-create'): void
  (e: 'edit', note: Note): void
  (e: 'delete', note: Note): void
}>()

const { t } = useI18n()
const localizedName = useLocalizedName()
const { formatDateTime } = useFormat()

function displayName(person: Person): string {
  return localizedName({ nameEn: person.fullNameEn, nameAr: person.fullNameAr })
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML.replace(/\n/g, '<br>')
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

.notes-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.note {
  padding: var(--spacing-3);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
}

.note.internal {
  background-color: var(--color-warning-50);
  border-color: var(--color-warning-200);
}

.note-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-2);
}

.note-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.timestamp {
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
}

.note-body {
  font-size: var(--font-size-sm);
  color: var(--color-gray-900);
  line-height: 1.6;
}

.note-actions {
  display: flex;
  gap: var(--spacing-2);
  margin-top: var(--spacing-2);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.note-input {
  min-height: 6rem;
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--font-size-base);
  resize: vertical;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
}

.form-actions {
  display: flex;
  gap: var(--spacing-2);
}
</style>
