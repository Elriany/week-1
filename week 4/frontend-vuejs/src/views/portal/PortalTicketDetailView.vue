<template>
  <div class="portal-ticket-detail-view">
    <div v-if="loading" class="centered">
      <BaseSpinner />
    </div>

    <p v-else-if="notFound" class="error-state">
      <strong>{{ t('portal.detail.notFound') }}</strong><br />
      {{ t('portal.detail.notFoundHint') }}<br />
      <RouterLink :to="{ name: 'portal-tickets' }">{{ t('portal.backToList') }}</RouterLink>
    </p>

    <p v-else-if="loadError" class="error-text" role="alert">{{ loadError }}</p>

    <div v-else-if="ticket">
      <BaseCard>
        <template #header>
          <div class="card-header">
            <h3>{{ t('portal.detail.title') }}</h3>
            <RouterLink :to="{ name: 'portal-tickets' }">{{ t('portal.backToList') }}</RouterLink>
          </div>
        </template>

        <div class="profile-display">
          <div class="profile-field">
            <label>{{ t('tickets.columns.number') }}</label>
            <div><bdi class="mono">{{ ticket.ticketNumber }}</bdi></div>
          </div>
          <div class="profile-field">
            <label>{{ t('tickets.columns.subject') }}</label>
            <div>{{ ticket.subject }}</div>
          </div>
          <div class="profile-field">
            <label>{{ t('tickets.columns.status') }}</label>
            <div><BaseBadge :variant="statusVariant(ticket.status?.code)" :label="localizedName(ticket.status)" /></div>
          </div>
          <div class="profile-field">
            <label>{{ t('tickets.sla.label') }}</label>
            <div><SlaBadge :sla="ticket.sla" /></div>
          </div>
          <div class="profile-field">
            <label>{{ t('tickets.columns.category') }}</label>
            <div>{{ ticket.category ? localizedName(ticket.category) : '—' }}</div>
          </div>
          <div class="profile-field">
            <label>{{ t('tickets.columns.createdAt') }}</label>
            <div>{{ formatDateTime(ticket.createdAt) }}</div>
          </div>
          <div class="profile-field full">
            <label>{{ t('portal.form.description') }}</label>
            <div>{{ ticket.description || '—' }}</div>
          </div>
        </div>
      </BaseCard>

      <TicketNotesList
        :notes="notes"
        :loading="loadingNotes"
        :error="noteError"
        :can-add-note="true"
        :allow-internal-toggle="false"
        :can-edit="() => false"
        :creating="creatingNote"
        :form="newNoteForm"
        :form-error="noteFormError"
        :saving="savingNote"
        @open-create="creatingNote = true"
        @submit-create="submitReply"
        @cancel-create="creatingNote = false"
      />

      <AttachmentsList
        :attachments="attachments"
        :loading="loadingAttachments"
        :error="attachmentError"
        :can-upload="false"
        @download="downloadAttachment"
      />

      <TicketHistoryTimeline
        :entries="history"
        :loading="loadingHistory"
        :error="historyError"
        :has-more="canLoadMoreHistory"
        :loading-more="loadingMore"
        @load-more="loadMoreHistory"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { statusVariant } from '@/composables/ticketBadges'
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { useFormat } from '@/composables/useFormat'
import { useApiError } from '@/composables/useApiError'
import { useAppStore } from '@/stores/app.store'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import SlaBadge from '@/components/tickets/SlaBadge.vue'
import TicketNotesList from '@/components/tickets/TicketNotesList.vue'
import AttachmentsList from '@/components/common/AttachmentsList.vue'
import TicketHistoryTimeline from '@/components/tickets/TicketHistoryTimeline.vue'

const PAGE_SIZE = 20

interface Ref_ {
  id: string
  code: string
  nameEn: string
  nameAr: string
}

interface Person {
  id: string
  fullNameEn: string
  fullNameAr: string
}

interface PortalTicket {
  id: string
  ticketNumber: string
  subject: string
  description: string | null
  status: Ref_
  category: Ref_ | null
  sla: { status: 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'MET' } | null
  createdAt: Date
  updatedAt: Date
}

interface Note {
  id: string
  ticketId: string
  body: string
  isInternal: boolean
  createdAt: Date
  author: Person | null
}

interface Attachment {
  id: string
  originalName: string
  sizeBytes: number
  createdAt: Date
  uploader: Person | null
}

interface HistoryEntry {
  id: string
  kind: 'audit' | 'note' | 'attachment'
  createdAt: Date
  actor?: Person
  action?: string
  fromValue?: string
  toValue?: string
  note?: string
  body?: string
  fileName?: string
}

const { t } = useI18n()
const route = useRoute()
const localizedName = useLocalizedName()
const appStore = useAppStore()
const { formatDateTime } = useFormat()
const { messageFor } = useApiError()

const ticket = ref<PortalTicket | null>(null)
const notes = ref<Note[]>([])
const attachments = ref<Attachment[]>([])
const history = ref<HistoryEntry[]>([])

const loading = ref(true)
const notFound = ref(false)
const loadError = ref('')

const loadingNotes = ref(false)
const noteError = ref('')
const creatingNote = ref(false)
const savingNote = ref(false)
const noteFormError = ref('')
const newNoteForm = reactive({ body: '', isInternal: false })

const loadingAttachments = ref(false)
const attachmentError = ref('')

const loadingHistory = ref(false)
const historyError = ref('')
const historyPage = ref(1)
const canLoadMoreHistory = ref(false)
const loadingMore = ref(false)

async function loadTicket() {
  loading.value = true
  notFound.value = false
  loadError.value = ''
  try {
    const response = await api.get(`/portal/tickets/${route.params.id}`)
    ticket.value = {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
    }
    appStore.setBreadcrumbItemLabel(response.data.ticketNumber)
    await Promise.all([loadNotes(), loadAttachments(), loadHistory()])
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound.value = true
    } else {
      loadError.value = messageFor(err)
    }
  } finally {
    loading.value = false
  }
}

async function loadNotes() {
  loadingNotes.value = true
  noteError.value = ''
  try {
    const response = await api.get(`/portal/tickets/${route.params.id}/notes`)
    notes.value = response.data.map((n: Omit<Note, 'createdAt'> & { createdAt: string }) => ({ ...n, createdAt: new Date(n.createdAt) }))
  } catch (err) {
    noteError.value = messageFor(err)
  } finally {
    loadingNotes.value = false
  }
}

async function loadAttachments() {
  loadingAttachments.value = true
  attachmentError.value = ''
  try {
    const response = await api.get(`/portal/tickets/${route.params.id}/attachments`)
    attachments.value = response.data.map((a: Omit<Attachment, 'createdAt'> & { createdAt: string }) => ({ ...a, createdAt: new Date(a.createdAt) }))
  } catch (err) {
    attachmentError.value = messageFor(err)
  } finally {
    loadingAttachments.value = false
  }
}

async function loadHistory(page = 1) {
  if (page === 1) {
    loadingHistory.value = true
    historyPage.value = 1
    history.value = []
  } else {
    loadingMore.value = true
  }
  historyError.value = ''
  try {
    const response = await api.get(`/portal/tickets/${route.params.id}/history?page=${page}&pageSize=${PAGE_SIZE}`)
    const entries = response.data.items.map((e: Omit<HistoryEntry, 'createdAt'> & { createdAt: string }) => ({ ...e, createdAt: new Date(e.createdAt) }))
    history.value = page === 1 ? entries : [...history.value, ...entries]
    historyPage.value = page
    canLoadMoreHistory.value = page * PAGE_SIZE < response.data.total
  } catch (err) {
    historyError.value = messageFor(err)
  } finally {
    if (page === 1) loadingHistory.value = false
    else loadingMore.value = false
  }
}

async function loadMoreHistory() {
  await loadHistory(historyPage.value + 1)
}

async function submitReply() {
  noteFormError.value = ''
  savingNote.value = true
  try {
    await api.post(`/portal/tickets/${route.params.id}/notes`, { body: newNoteForm.body })
    creatingNote.value = false
    newNoteForm.body = ''
    await Promise.all([loadNotes(), loadHistory()])
  } catch (err) {
    noteFormError.value = messageFor(err)
  } finally {
    savingNote.value = false
  }
}

async function downloadAttachment(attachment: Attachment) {
  try {
    await api.download(`/portal/tickets/${route.params.id}/attachments/${attachment.id}/download`)
  } catch (err) {
    attachmentError.value = messageFor(err)
  }
}

onMounted(loadTicket)
// Clear on unmount, or the next screen's breadcrumb shows this record's name.
onUnmounted(() => appStore.setBreadcrumbItemLabel(''))
</script>

<style scoped>
.portal-ticket-detail-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
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

.profile-display {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-4);
}

.profile-field.full {
  grid-column: 1 / -1;
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

.mono {
  font-family: monospace;
}
</style>
