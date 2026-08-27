<template>
  <div class="customer-detail-view">
    <div v-if="loading" class="centered">
      <BaseSpinner />
    </div>

    <p v-else-if="notFound" class="error-state">
      <strong>{{ t('customers.detail.notFound.title') }}</strong><br />
      {{ t('customers.detail.notFound.description') }}<br />
      <RouterLink :to="{ name: 'customers' }">{{ t('customers.detail.backToList') }}</RouterLink>
    </p>

    <p v-else-if="forbidden" class="error-state">
      {{ t('errors.forbidden') }}<br />
      <RouterLink :to="{ name: 'customers' }">{{ t('customers.detail.backToList') }}</RouterLink>
    </p>

    <p v-else-if="loadError" class="error-text" role="alert">{{ loadError }}</p>

    <div v-else-if="customer">
      <!-- Profile -->
      <BaseCard>
        <template #header>
          <div class="card-header">
            <h3>{{ t('customers.detail.title') }}</h3>
            <RouterLink :to="{ name: 'customers' }">{{ t('customers.detail.backToList') }}</RouterLink>
          </div>
        </template>

        <div v-if="!editMode" class="profile-display">
          <div class="profile-field">
            <label>{{ t('customers.columns.code') }}</label>
            <div><bdi class="mono">{{ customer.code }}</bdi></div>
          </div>
          <div class="profile-field">
            <label>{{ t('customers.columns.nameEn') }}</label>
            <div>{{ customer.fullNameEn }}</div>
          </div>
          <div class="profile-field">
            <label>{{ t('customers.columns.nameAr') }}</label>
            <div>{{ customer.fullNameAr }}</div>
          </div>
          <div class="profile-field">
            <label>{{ t('customers.columns.email') }}</label>
            <div><bdi>{{ customer.email || '—' }}</bdi></div>
          </div>
          <div class="profile-field">
            <label>{{ t('customers.columns.phone') }}</label>
            <div><bdi>{{ customer.phone || '—' }}</bdi></div>
          </div>
          <div class="profile-field">
            <label>{{ t('customers.columns.language') }}</label>
            <div>{{ customer.preferredLanguage === 'ar' ? t('common.arabic') : t('common.english') }}</div>
          </div>
          <div class="profile-field">
            <label>{{ t('customers.columns.status') }}</label>
            <div>
              <BaseBadge
                :variant="customer.isActive ? 'success' : 'gray'"
                :label="customer.isActive ? t('customers.status.active') : t('customers.status.inactive')"
              />
            </div>
          </div>

          <div v-if="auth.can('customers.update')" class="profile-actions">
            <BaseButton variant="primary" size="md" @click="editMode = true">
              {{ t('customers.detail.edit') }}
            </BaseButton>
          </div>
        </div>

        <form v-else class="profile-form" @submit.prevent="submitEdit">
          <BaseInput v-model="editForm.fullNameEn" :label="t('customers.columns.nameEn')" required />
          <BaseInput v-model="editForm.fullNameAr" :label="t('customers.columns.nameAr')" required />
          <BaseInput v-model="editForm.email" type="email" :label="t('customers.columns.email')" />
          <BaseInput v-model="editForm.phone" type="tel" :label="t('customers.columns.phone')" />

          <label class="select-field">
            <span>{{ t('customers.columns.language') }}</span>
            <select v-model="editForm.preferredLanguage">
              <option value="en">{{ t('common.english') }}</option>
              <option value="ar">{{ t('common.arabic') }}</option>
            </select>
          </label>

          <p v-if="editError" class="error-text" role="alert">{{ editError }}</p>

          <div class="form-actions">
            <BaseButton variant="primary" size="md" type="submit" :loading="editing">
              {{ t('common.save') }}
            </BaseButton>
            <BaseButton variant="secondary" size="md" type="button" @click="editMode = false">
              {{ t('common.cancel') }}
            </BaseButton>
          </div>
        </form>
      </BaseCard>

      <!-- Contacts -->
      <BaseCard>
        <template #header>
          <div class="card-header">
            <h3>{{ t('customers.contacts.title') }}</h3>
            <BaseButton
              v-if="auth.can('customers.update')"
              variant="primary"
              size="md"
              type="button"
              @click="openCreateContact"
            >
              {{ t('customers.contacts.add') }}
            </BaseButton>
          </div>
        </template>

        <div v-if="loadingContacts" class="centered">
          <BaseSpinner />
        </div>

        <p v-else-if="contactError" class="error-text" role="alert">{{ contactError }}</p>

        <EmptyState
          v-else-if="contacts.length === 0"
          :title="t('customers.contacts.empty.title')"
          :description="t('customers.contacts.empty.description')"
        />

        <div v-else class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{{ t('customers.columns.name') }}</th>
                <th>Job Title</th>
                <th>{{ t('customers.columns.email') }}</th>
                <th>{{ t('customers.columns.phone') }}</th>
                <th>Status</th>
                <th v-if="auth.can('customers.update')">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="contact in contacts" :key="contact.id">
                <td>{{ contactName(contact) }}</td>
                <td>{{ contact.jobTitle || '—' }}</td>
                <td><bdi>{{ contact.email || '—' }}</bdi></td>
                <td><bdi>{{ contact.phone || '—' }}</bdi></td>
                <td>
                  <BaseBadge
                    v-if="contact.isPrimary"
                    variant="info"
                    :label="t('customers.contacts.primary')"
                  />
                  <span v-else-if="contacts.length === 1 || !contacts.some(c => c.isPrimary)" class="hint">
                    {{ t('customers.contacts.noPrimary') }}
                  </span>
                </td>
                <td v-if="auth.can('customers.update')">
                  <div class="actions">
                    <BaseButton
                      variant="secondary"
                      size="sm"
                      type="button"
                      @click="editingContactId = contact.id; editContactForm = { ...contact }"
                    >
                      {{ t('customers.contacts.edit') }}
                    </BaseButton>
                    <BaseButton
                      variant="danger"
                      size="sm"
                      type="button"
                      @click="confirmDeleteContact(contact)"
                    >
                      {{ t('customers.contacts.delete') }}
                    </BaseButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <BaseCard v-if="creatingContact" :title="t('customers.contacts.add')">
          <form class="form" @submit.prevent="submitCreateContact">
            <BaseInput v-model="newContactForm.fullNameEn" :label="t('customers.columns.nameEn')" required />
            <BaseInput v-model="newContactForm.fullNameAr" :label="t('customers.columns.nameAr')" required />
            <BaseInput v-model="newContactForm.jobTitle" label="Job Title" />
            <BaseInput v-model="newContactForm.email" type="email" :label="t('customers.columns.email')" />
            <BaseInput v-model="newContactForm.phone" type="tel" :label="t('customers.columns.phone')" />
            <label class="checkbox">
              <input v-model="newContactForm.isPrimary" type="checkbox" />
              {{ t('customers.contacts.primary') }}
            </label>
            <p v-if="contactFormError" class="error-text">{{ contactFormError }}</p>
            <div class="form-actions">
              <BaseButton variant="primary" size="md" type="submit" :loading="savingContact">
                {{ t('common.save') }}
              </BaseButton>
              <BaseButton variant="secondary" size="md" type="button" @click="creatingContact = false">
                {{ t('common.cancel') }}
              </BaseButton>
            </div>
          </form>
        </BaseCard>
      </BaseCard>

      <!-- Notes -->
      <BaseCard>
        <template #header>
          <div class="card-header">
            <h3>{{ t('customers.notes.title') }}</h3>
            <BaseButton
              v-if="auth.can('customers.update')"
              variant="primary"
              size="md"
              type="button"
              @click="openCreateNote"
            >
              {{ t('customers.notes.add') }}
            </BaseButton>
          </div>
        </template>

        <div v-if="loadingNotes" class="centered">
          <BaseSpinner />
        </div>

        <p v-else-if="noteError" class="error-text" role="alert">{{ noteError }}</p>

        <EmptyState
          v-else-if="notes.length === 0"
          :title="t('customers.notes.empty.title')"
          :description="t('customers.notes.empty.description')"
        />

        <div v-else class="notes-list">
          <article v-for="note in notes" :key="note.id" class="note">
            <div class="note-header">
              <strong>{{ note.author ? noteAuthorName(note.author) : '—' }}</strong>
              <span class="timestamp">{{ formatDateTime(note.createdAt) }}</span>
            </div>
            <div class="note-body" v-html="escapeHtml(note.body)"></div>
            <div v-if="canEditNote(note)" class="note-actions">
              <BaseButton
                variant="secondary"
                size="sm"
                type="button"
                @click="editingNoteId = note.id; editNoteForm.body = note.body"
              >
                {{ t('customers.notes.edit') }}
              </BaseButton>
              <BaseButton
                variant="danger"
                size="sm"
                type="button"
                @click="confirmDeleteNote(note)"
              >
                {{ t('customers.notes.delete') }}
              </BaseButton>
            </div>
          </article>
        </div>

        <BaseCard v-if="creatingNote" :title="t('customers.notes.add')">
          <form class="form" @submit.prevent="submitCreateNote">
            <textarea
              v-model="newNoteForm.body"
              class="note-input"
              :placeholder="t('customers.notes.placeholder')"
              required
            ></textarea>
            <p v-if="noteFormError" class="error-text">{{ noteFormError }}</p>
            <div class="form-actions">
              <BaseButton variant="primary" size="md" type="submit" :loading="savingNote">
                {{ t('common.save') }}
              </BaseButton>
              <BaseButton variant="secondary" size="md" type="button" @click="creatingNote = false">
                {{ t('common.cancel') }}
              </BaseButton>
            </div>
          </form>
        </BaseCard>
      </BaseCard>

      <!-- Story 10: Placeholder for attachments and interaction history -->
      <BaseCard>
        <div class="placeholder">
          <!-- Story 10 inserts attachments and interaction history here -->
        </div>
      </BaseCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { useFormat } from '@/composables/useFormat'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

interface Customer {
  id: string
  code: string
  fullNameEn: string
  fullNameAr: string
  email: string | null
  phone: string | null
  preferredLanguage: string
  isActive: boolean
  branchId: string
}

interface Contact {
  id: string
  customerId: string
  fullNameEn: string
  fullNameAr: string
  jobTitle: string | null
  email: string | null
  phone: string | null
  isPrimary: boolean
}

interface NoteAuthor {
  id: string
  fullNameEn: string
  fullNameAr: string
}

interface Note {
  id: string
  customerId: string
  body: string
  createdAt: Date
  author: NoteAuthor | null
}

const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()
const localizedName = useLocalizedName()
const { formatDateTime } = useFormat()

const customer = ref<Customer | null>(null)
const contacts = ref<Contact[]>([])
const notes = ref<Note[]>([])

const loading = ref(true)
const notFound = ref(false)
const forbidden = ref(false)
const loadError = ref('')
const loadingContacts = ref(false)
const contactError = ref('')
const loadingNotes = ref(false)
const noteError = ref('')

const editMode = ref(false)
const editing = ref(false)
const editError = ref('')
const editForm = reactive({ fullNameEn: '', fullNameAr: '', email: '', phone: '', preferredLanguage: 'en' })

const creatingContact = ref(false)
const editingContactId = ref<string | null>(null)
const savingContact = ref(false)
const contactFormError = ref('')
const newContactForm = reactive({ fullNameEn: '', fullNameAr: '', jobTitle: '', email: '', phone: '', isPrimary: false })
const editContactForm = reactive({ fullNameEn: '', fullNameAr: '', jobTitle: '', email: '', phone: '', isPrimary: false })

const creatingNote = ref(false)
const editingNoteId = ref<string | null>(null)
const savingNote = ref(false)
const noteFormError = ref('')
const newNoteForm = reactive({ body: '' })
const editNoteForm = reactive({ body: '' })

const deletingContactId = ref<string | null>(null)
const deletingNoteId = ref<string | null>(null)

function contactName(contact: Contact): string {
  return localizedName({ nameEn: contact.fullNameEn, nameAr: contact.fullNameAr })
}

function noteAuthorName(author: NoteAuthor): string {
  return localizedName({ nameEn: author.fullNameEn, nameAr: author.fullNameAr })
}

function canEditNote(note: Note): boolean {
  const isAuthor = note.author?.id === auth.user?.id
  const isAdmin = auth.user?.permissions?.includes('users.deactivate')
  return isAuthor || isAdmin
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML.replace(/\n/g, '<br>')
}

async function loadCustomer() {
  loading.value = true
  notFound.value = false
  forbidden.value = false
  loadError.value = ''

  try {
    const response = await api.get(`/customers/${route.params.id}`)
    customer.value = response.data
    editForm.fullNameEn = customer.value.fullNameEn
    editForm.fullNameAr = customer.value.fullNameAr
    editForm.email = customer.value.email || ''
    editForm.phone = customer.value.phone || ''
    editForm.preferredLanguage = customer.value.preferredLanguage

    await loadContacts()
    await loadNotes()
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) {
        notFound.value = true
      } else if (err.status === 403) {
        forbidden.value = true
      } else {
        loadError.value = err.serverMessage ?? t('errors.unreachable')
      }
    } else {
      loadError.value = t('errors.unreachable')
    }
  } finally {
    loading.value = false
  }
}

async function loadContacts() {
  loadingContacts.value = true
  contactError.value = ''
  try {
    const response = await api.get(`/customers/${route.params.id}/contacts`)
    contacts.value = response.data
  } catch (err) {
    contactError.value = err instanceof ApiError ? err.serverMessage ?? t('errors.unreachable') : t('errors.unreachable')
  } finally {
    loadingContacts.value = false
  }
}

async function loadNotes() {
  loadingNotes.value = true
  noteError.value = ''
  try {
    const response = await api.get(`/customers/${route.params.id}/notes`)
    notes.value = response.data.map((n: any) => ({ ...n, createdAt: new Date(n.createdAt) }))
  } catch (err) {
    noteError.value = err instanceof ApiError ? err.serverMessage ?? t('errors.unreachable') : t('errors.unreachable')
  } finally {
    loadingNotes.value = false
  }
}

async function submitEdit() {
  editError.value = ''
  editing.value = true

  try {
    await api.patch(`/customers/${customer.value!.id}`, {
      fullNameEn: editForm.fullNameEn,
      fullNameAr: editForm.fullNameAr,
      email: editForm.email || null,
      phone: editForm.phone || null,
      preferredLanguage: editForm.preferredLanguage,
    })
    editMode.value = false
    await loadCustomer()
  } catch (err) {
    editError.value = err instanceof ApiError ? err.serverMessage ?? t('errors.unreachable') : t('errors.unreachable')
  } finally {
    editing.value = false
  }
}

function openCreateContact() {
  newContactForm.fullNameEn = ''
  newContactForm.fullNameAr = ''
  newContactForm.jobTitle = ''
  newContactForm.email = ''
  newContactForm.phone = ''
  newContactForm.isPrimary = false
  contactFormError.value = ''
  creatingContact.value = true
}

async function submitCreateContact() {
  contactFormError.value = ''
  savingContact.value = true

  try {
    await api.post(`/customers/${customer.value!.id}/contacts`, newContactForm)
    creatingContact.value = false
    await loadContacts()
  } catch (err) {
    contactFormError.value = err instanceof ApiError ? err.serverMessage ?? t('errors.unreachable') : t('errors.unreachable')
  } finally {
    savingContact.value = false
  }
}

function confirmDeleteContact(contact: Contact) {
  if (confirm(t('customers.contacts.confirmDelete'))) {
    deleteContact(contact.id)
  }
}

async function deleteContact(contactId: string) {
  deletingContactId.value = contactId

  try {
    await api.delete(`/customers/${customer.value!.id}/contacts/${contactId}`)
    await loadContacts()
  } catch (err) {
    contactError.value = err instanceof ApiError ? err.serverMessage ?? t('errors.unreachable') : t('errors.unreachable')
  } finally {
    deletingContactId.value = null
  }
}

function openCreateNote() {
  newNoteForm.body = ''
  noteFormError.value = ''
  creatingNote.value = true
}

async function submitCreateNote() {
  noteFormError.value = ''
  savingNote.value = true

  try {
    await api.post(`/customers/${customer.value!.id}/notes`, { body: newNoteForm.body })
    creatingNote.value = false
    await loadNotes()
  } catch (err) {
    noteFormError.value = err instanceof ApiError ? err.serverMessage ?? t('errors.unreachable') : t('errors.unreachable')
  } finally {
    savingNote.value = false
  }
}

function confirmDeleteNote(note: Note) {
  if (confirm(t('customers.notes.confirmDelete'))) {
    deleteNote(note.id)
  }
}

async function deleteNote(noteId: string) {
  deletingNoteId.value = noteId

  try {
    await api.delete(`/customers/${customer.value!.id}/notes/${noteId}`)
    await loadNotes()
  } catch (err) {
    noteError.value = err instanceof ApiError ? err.serverMessage ?? t('errors.unreachable') : t('errors.unreachable')
  } finally {
    deletingNoteId.value = null
  }
}

onMounted(() => {
  loadCustomer()
})
</script>

<style scoped>
.customer-detail-view {
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

.centered {
  display: flex;
  justify-content: center;
  padding: var(--spacing-8);
}

.error-state {
  padding: var(--spacing-4);
  color: var(--color-danger);
  line-height: 1.6;
}

.error-state a {
  color: var(--color-primary);
  text-decoration: underline;
}

.error-text {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin: 0;
}

.profile-display {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-4);
}

.profile-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.profile-field label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-700);
}

.profile-field div {
  font-size: var(--font-size-base);
  color: var(--color-gray-900);
}

.mono {
  font-family: monospace;
}

.profile-actions {
  grid-column: 1 / -1;
  margin-top: var(--spacing-2);
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.table-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: var(--spacing-3);
  text-align: start;
  border-bottom: 1px solid var(--color-gray-200);
  white-space: nowrap;
}

th {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-700);
}

td {
  font-size: var(--font-size-sm);
  color: var(--color-gray-900);
}

.hint {
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
}

.actions {
  display: flex;
  gap: var(--spacing-2);
  white-space: normal;
}

.select-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-700);
}

.select-field select {
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-family: inherit;
}

.form-actions {
  display: flex;
  gap: var(--spacing-2);
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.note {
  padding: var(--spacing-4);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
  font-size: var(--font-size-sm);
}

.timestamp {
  color: var(--color-gray-600);
  font-size: var(--font-size-xs);
}

.note-body {
  white-space: pre-wrap;
  word-wrap: break-word;
  color: var(--color-gray-900);
  margin-bottom: var(--spacing-2);
}

.note-actions {
  display: flex;
  gap: var(--spacing-2);
  margin-top: var(--spacing-2);
}

.note-input {
  width: 100%;
  min-height: 120px;
  padding: var(--spacing-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-family: monospace;
  font-size: var(--font-size-sm);
  resize: vertical;
}

.placeholder {
  padding: var(--spacing-6);
  text-align: center;
  color: var(--color-gray-500);
  font-size: var(--font-size-sm);
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.checkbox input {
  cursor: pointer;
}
</style>
