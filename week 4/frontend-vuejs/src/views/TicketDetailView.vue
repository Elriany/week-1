<template>
  <div class="ticket-detail-view">
    <div v-if="loading" class="centered">
      <BaseSpinner />
    </div>

    <p v-else-if="notFound" class="error-state">
      <strong>{{ t('tickets.detail.notFound.title') }}</strong><br />
      {{ t('tickets.detail.notFound.description') }}<br />
      <RouterLink :to="{ name: 'tickets' }">{{ t('tickets.detail.backToList') }}</RouterLink>
    </p>

    <p v-else-if="forbidden" class="error-state">
      {{ t('errors.forbidden') }}<br />
      <RouterLink :to="{ name: 'tickets' }">{{ t('tickets.detail.backToList') }}</RouterLink>
    </p>

    <p v-else-if="loadError" class="error-text" role="alert">{{ loadError }}</p>

    <div v-else-if="ticket">
      <!-- Profile/Header Card -->
      <BaseCard>
        <template #header>
          <div class="card-header">
            <h3>{{ t('tickets.detail.title') }}</h3>
            <RouterLink :to="{ name: 'tickets' }">{{ t('tickets.detail.backToList') }}</RouterLink>
          </div>
        </template>

        <div v-if="!editMode" class="profile-display">
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
            <div>
              <BaseBadge
                :variant="statusVariant(ticket.status?.code)"
                :label="localizedName(ticket.status)"
              />
            </div>
          </div>
          <div class="profile-field">
            <label>{{ t('tickets.columns.priority') }}</label>
            <div>
              <BaseBadge
                :variant="priorityVariant(ticket.priority?.code)"
                :label="localizedName(ticket.priority)"
              />
            </div>
          </div>
          <div class="profile-field">
            <label>{{ t('tickets.columns.customer') }}</label>
            <div><RouterLink :to="{ name: 'customer-detail', params: { id: ticket.customerId } }">{{ displayCustomerName(ticket) }}</RouterLink></div>
          </div>
          <div class="profile-field">
            <label>{{ t('tickets.columns.category') }}</label>
            <div>{{ localizedName(ticket.category) }}</div>
          </div>
          <div class="profile-field">
            <label>{{ t('tickets.create.selectDepartment') }}</label>
            <div>{{ ticket.department || '—' }}</div>
          </div>
          <div class="profile-field">
            <label>{{ t('tickets.columns.assignee') }}</label>
            <div>{{ ticket.assignee ? displayAssigneeName(ticket.assignee) : '—' }}</div>
          </div>
          <div class="profile-field">
            <label>{{ t('tickets.columns.createdAt') }}</label>
            <div>{{ formatDateTime(ticket.createdAt) }}</div>
          </div>
          <div class="profile-field">
            <label>{{ t('tickets.columns.updatedAt') }}</label>
            <div>{{ formatDateTime(ticket.updatedAt) }}</div>
          </div>

          <div v-if="auth.can('tickets.update')" class="profile-actions">
            <BaseButton variant="primary" size="md" @click="editMode = true">
              {{ t('tickets.detail.edit') }}
            </BaseButton>
          </div>
        </div>

        <form v-else class="profile-form" @submit.prevent="submitEdit">
          <BaseInput v-model="editForm.subject" :label="t('tickets.columns.subject')" required />
          <label class="select-field">
            <span>{{ t('tickets.columns.description') }}</span>
            <textarea
              v-model="editForm.description"
              class="textarea-input"
              :placeholder="t('tickets.create.descriptionPlaceholder')"
            ></textarea>
          </label>

          <label class="select-field">
            <span>{{ t('tickets.columns.priority') }}</span>
            <select v-model="editForm.priorityCode">
              <option value="">{{ t('tickets.create.selectPriority') }}</option>
              <option v-for="priority in meta.priorities" :key="priority.code" :value="priority.code">
                {{ localizedName(priority) }}
              </option>
            </select>
          </label>

          <label class="select-field">
            <span>{{ t('tickets.columns.category') }}</span>
            <select v-model="editForm.categoryCode">
              <option value="">{{ t('tickets.create.selectCategory') }}</option>
              <option v-for="category in meta.categories" :key="category.code" :value="category.code">
                {{ localizedName(category) }}
              </option>
            </select>
          </label>

          <label class="select-field">
            <span>{{ t('tickets.create.selectDepartment') }}</span>
            <input v-model="editForm.department" type="text" class="select-input" />
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

      <!-- SLA Card — stays visible even with no policy, so the absence reads
           as a fact about this priority rather than a loading failure. -->
      <BaseCard :title="t('tickets.sla.label')">
        <div v-if="ticket.sla" class="sla-grid">
          <div class="sla-field">
            <label>{{ t('tickets.sla.label') }}</label>
            <div><SlaBadge :sla="ticket.sla" /></div>
          </div>
          <div class="sla-field">
            <label>{{ t('tickets.sla.responseDue') }}</label>
            <div>{{ formatDateTime(ticket.sla.responseDueAt) }}</div>
          </div>
          <div class="sla-field">
            <label>{{ t('tickets.sla.resolutionDue') }}</label>
            <div>{{ formatDateTime(ticket.sla.resolutionDueAt) }}</div>
          </div>
          <div class="sla-field">
            <label>{{ t('tickets.sla.respondedAt') }}</label>
            <div>{{ ticket.firstRespondedAt ? formatDateTime(ticket.firstRespondedAt) : '—' }}</div>
          </div>
          <div class="sla-field">
            <label>{{ t('tickets.sla.resolvedAt') }}</label>
            <div>{{ ticket.resolvedAt ? formatDateTime(ticket.resolvedAt) : '—' }}</div>
          </div>
        </div>
        <p v-else class="hint">{{ t('tickets.sla.noPolicy') }}</p>
      </BaseCard>

      <!-- Knowledge Base panel — lets an agent search without leaving the ticket. -->
      <BaseCard v-if="auth.can('kb.read')">
        <template #header>
          <button type="button" class="card-header kb-panel-toggle" @click="toggleKbPanel">
            <h3>{{ t('kb.panel.title') }}</h3>
            <span>{{ kbPanelOpen ? '▲' : '▼' }}</span>
          </button>
        </template>

        <div v-if="kbPanelOpen">
          <BaseInput v-model="kbQuery" type="search" :label="t('kb.panel.search')" />

          <div v-if="kbLoading" class="centered">
            <BaseSpinner />
          </div>
          <p v-else-if="kbError" class="error-text" role="alert">{{ kbError }}</p>
          <p v-else-if="kbResults.length === 0" class="hint">{{ t('kb.panel.noResults') }}</p>
          <ul v-else class="kb-results">
            <li v-for="article in kbResults" :key="article.id">
              <a :href="kbArticleHref(article.id)" target="_blank" rel="noopener">
                {{ localizedName({ nameEn: article.titleEn, nameAr: article.titleAr }) }}
              </a>
            </li>
          </ul>
        </div>
      </BaseCard>

      <!-- Lifecycle Actions Card (hidden if CLOSED) -->
      <BaseCard v-if="ticket.status?.code !== 'CLOSED'" :title="t('tickets.detail.title')">
        <div class="lifecycle-section">
          <div class="lifecycle-subsection">
            <h4>{{ t('tickets.columns.status') }}</h4>
            <p class="current-status">
              {{ t('tickets.columns.status') }}: <strong>{{ localizedName(ticket.status) }}</strong>
            </p>
            <BaseButton
              variant="primary"
              size="md"
              type="button"
              :disabled="allowedTransitions.length === 0"
              @click="showStatusDialog = true"
            >
              {{ t('tickets.status.change') }}
            </BaseButton>
          </div>

          <div v-if="auth.can('tickets.assign')" class="lifecycle-subsection">
            <h4>{{ t('tickets.columns.assignee') }}</h4>
            <p class="current-assignee">
              {{ t('tickets.columns.assignee') }}: <strong>{{ ticket.assignee ? displayAssigneeName(ticket.assignee) : t('tickets.assignee.none') }}</strong>
            </p>
            <BaseButton
              variant="primary"
              size="md"
              type="button"
              @click="showAssignDialog = true"
            >
              {{ ticket.assignee ? t('tickets.assignee.reassign') : t('tickets.assignee.assign') }}
            </BaseButton>
          </div>
        </div>
      </BaseCard>

      <!-- Status Change Dialog -->
      <BaseDialog
        :is-open="showStatusDialog"
        :title="t('tickets.status.label')"
        @close="closeStatusDialog"
      >
        <div class="dialog-content">
          <p v-if="allowedTransitions.length === 0" class="info-text">
            {{ t('tickets.status.noTransitions') }}
          </p>
          <div v-else>
            <label class="select-field">
              <span>{{ t('tickets.columns.status') }}</span>
              <select v-model="statusTransitionTarget">
                <option value="">Select status</option>
                <option v-for="target in allowedTransitions" :key="target" :value="target">
                  {{ getStatusLabel(target) }}
                </option>
              </select>
            </label>
            <label class="select-field">
              <span>{{ t('common.note') }} ({{ t('common.optional') }})</span>
              <textarea
                v-model="statusTransitionNote"
                class="textarea-input"
                :placeholder="t('tickets.notes.placeholder')"
              ></textarea>
            </label>
            <p v-if="statusError" class="error-text" role="alert">{{ statusError }}</p>
          </div>
        </div>
        <template #footer>
          <BaseButton variant="secondary" size="md" type="button" @click="closeStatusDialog">
            {{ t('common.cancel') }}
          </BaseButton>
          <BaseButton
            v-if="allowedTransitions.length > 0"
            variant="primary"
            size="md"
            type="button"
            :loading="updatingStatus"
            @click="submitStatusTransition"
          >
            {{ t('tickets.status.confirm') }}
          </BaseButton>
        </template>
      </BaseDialog>

      <!-- Assign Dialog -->
      <BaseDialog
        :is-open="showAssignDialog"
        :title="ticket.assignee ? t('tickets.assignee.reassign') : t('tickets.assignee.assign')"
        @close="closeAssignDialog"
      >
        <div class="dialog-content">
          <label class="select-field">
            <span>{{ t('tickets.columns.assignee') }}</span>
            <select v-model="assigneeTransitionTarget">
              <option value="">{{ t('tickets.filter.allAssignees') }}</option>
              <option v-for="user in assignees" :key="user.id" :value="user.id">
                {{ displayAssigneeName(user) }}
              </option>
            </select>
          </label>
          <p v-if="assigneeError" class="error-text" role="alert">{{ assigneeError }}</p>
        </div>
        <template #footer>
          <BaseButton variant="secondary" size="md" type="button" @click="closeAssignDialog">
            {{ t('common.cancel') }}
          </BaseButton>
          <BaseButton
            v-if="ticket.assignee"
            variant="danger"
            size="md"
            type="button"
            :loading="updatingAssignee"
            @click="submitUnassign"
          >
            {{ t('tickets.assignee.unassign') }}
          </BaseButton>
          <BaseButton
            variant="primary"
            size="md"
            type="button"
            :loading="updatingAssignee"
            @click="submitAssignee"
          >
            {{ t('common.save') }}
          </BaseButton>
        </template>
      </BaseDialog>

      <TicketNotesList
        :notes="notes"
        :loading="loadingNotes"
        :error="noteError"
        :can-add-note="auth.can('tickets.update')"
        :can-edit="canEditNote"
        :creating="creatingNote"
        :form="newNoteForm"
        :form-error="noteFormError"
        :saving="savingNote"
        @open-create="openCreateNote"
        @submit-create="submitCreateNote"
        @cancel-create="creatingNote = false"
        @edit="onEditNote"
        @delete="confirmDeleteNote"
      />

      <AttachmentsList
        :attachments="attachments"
        :loading="loadingAttachments"
        :error="attachmentError"
        :can-upload="auth.can('tickets.update')"
        :upload-endpoint="`/tickets/${ticket.id}/attachments`"
        @uploaded="loadAttachments"
        @download="downloadAttachment"
        @delete="confirmDeleteAttachment"
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
import { priorityVariant, statusVariant } from '@/composables/ticketBadges'
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@/api/client'
import { ApiError } from '@/types/api'
import { useAuthStore } from '@/stores/auth.store'
import { useAppStore } from '@/stores/app.store'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { useFormat } from '@/composables/useFormat'
import { useApiError } from '@/composables/useApiError'
import { useTicketMeta } from '@/composables/useTicketMeta'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import SlaBadge from '@/components/tickets/SlaBadge.vue'
import TicketNotesList from '@/components/tickets/TicketNotesList.vue'
import AttachmentsList from '@/components/common/AttachmentsList.vue'
import TicketHistoryTimeline from '@/components/tickets/TicketHistoryTimeline.vue'

interface SlaSnapshot {
  status: 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'MET'
  responseDueAt: string
  resolutionDueAt: string
}

interface Ref {
  code: string
  nameEn: string
  nameAr: string
}

interface User {
  id: string
  fullNameEn: string
  fullNameAr: string
}

interface Customer {
  id: string
  fullNameEn: string
  fullNameAr: string
}

interface Ticket {
  id: string
  ticketNumber: string
  subject: string
  description: string | null
  customerId: string
  customer?: Customer
  priority: Ref
  status: Ref
  category: Ref
  department: string | null
  assignee: User | null
  channel: string
  firstRespondedAt: Date | null
  resolvedAt: Date | null
  sla: SlaSnapshot | null
  createdAt: Date
  updatedAt: Date
}

interface Note {
  id: string
  ticketId: string
  body: string
  isInternal: boolean
  createdAt: Date
  author: User | null
}

interface Attachment {
  id: string
  originalName: string
  sizeBytes: number
  createdAt: Date
  uploader: User | null
}

interface HistoryEntry {
  id: string
  kind: 'audit' | 'note' | 'attachment'
  createdAt: Date
  actor?: User
  action?: string
  fromValue?: string
  toValue?: string
  note?: string
  body?: string
  fileName?: string
}

const TICKET_TRANSITIONS: Record<string, string[]> = {
  NEW: ['ASSIGNED', 'IN_PROGRESS', 'CLOSED'],
  ASSIGNED: ['IN_PROGRESS', 'PENDING_CUSTOMER', 'CLOSED'],
  IN_PROGRESS: ['PENDING_CUSTOMER', 'RESOLVED', 'CLOSED'],
  PENDING_CUSTOMER: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['IN_PROGRESS', 'CLOSED'],
  CLOSED: [],
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const appStore = useAppStore()
const localizedName = useLocalizedName()
const { formatDateTime } = useFormat()
const { messageFor: messageForBase } = useApiError()

const ticket = ref<Ticket | null>(null)
const notes = ref<Note[]>([])
const attachments = ref<Attachment[]>([])
const history = ref<HistoryEntry[]>([])
const ticketMeta = useTicketMeta()
const meta = ticketMeta.meta
const assignees = ref<User[]>([])

const loading = ref(true)
const notFound = ref(false)
const forbidden = ref(false)
const loadError = ref('')

const editMode = ref(false)
const editing = ref(false)
const editError = ref('')
const editForm = reactive({
  subject: '',
  description: '',
  priorityCode: '',
  categoryCode: '',
  department: '',
})

const loadingNotes = ref(false)
const noteError = ref('')
const creatingNote = ref(false)
const editingNoteId = ref<string | null>(null)
const savingNote = ref(false)
const noteFormError = ref('')
const newNoteForm = reactive({ body: '', isInternal: true })
const editNoteForm = reactive({ body: '' })

const loadingAttachments = ref(false)
const attachmentError = ref('')

const loadingHistory = ref(false)
const historyError = ref('')
const history_page = ref(1)
const canLoadMoreHistory = ref(true)
const loadingMore = ref(false)

interface KbArticleSummary {
  id: string
  titleEn: string
  titleAr: string
}

const kbPanelOpen = ref(false)
const kbQuery = ref('')
const kbResults = ref<KbArticleSummary[]>([])
const kbLoading = ref(false)
const kbError = ref('')
const kbSeeded = ref(false)
let kbRequestSeq = 0
let kbSearchTimer: ReturnType<typeof setTimeout> | undefined

const statusTransitionTarget = ref('')
const statusTransitionNote = ref('')
const updatingStatus = ref(false)
const statusError = ref('')

const assigneeTransitionTarget = ref('')
const updatingAssignee = ref(false)
const assigneeError = ref('')

const showStatusDialog = ref(false)
const showAssignDialog = ref(false)

const deletingNoteId = ref<string | null>(null)
const deletingAttachmentId = ref<string | null>(null)

function displayCustomerName(row: { fullNameEn?: string; fullNameAr?: string; customer?: { fullNameEn?: string; fullNameAr?: string } | null }): string {
  return localizedName({ nameEn: row.customer?.fullNameEn || row.fullNameEn, nameAr: row.customer?.fullNameAr || row.fullNameAr })
}

function displayAssigneeName(user: User): string {
  return localizedName({ nameEn: user.fullNameEn, nameAr: user.fullNameAr })
}

function getStatusLabel(code: string): string {
  const status = meta.value.statuses.find(s => s.code === code)
  return status ? localizedName(status) : code
}

const allowedTransitions = computed(() => {
  return ticket.value ? TICKET_TRANSITIONS[ticket.value.status?.code || 'NEW'] || [] : []
})

function canEditNote(note: Note): boolean {
  const isAuthor = note.author?.id === auth.user?.id
  const isAdmin = auth.user?.role?.code === 'ADMIN'
  return isAuthor || isAdmin
}

function onEditNote(note: Note) {
  editingNoteId.value = note.id
  editNoteForm.body = note.body
}

function kbArticleHref(id: string): string {
  return router.resolve({ name: 'kb-article', params: { id } }).href
}

async function loadKbResults() {
  const seq = ++kbRequestSeq
  kbLoading.value = true
  kbError.value = ''
  try {
    const params = new URLSearchParams()
    if (kbQuery.value.trim()) params.set('q', kbQuery.value.trim())
    params.set('pageSize', '5')
    const response = await api.get(`/kb/articles?${params}`)
    if (seq !== kbRequestSeq) return
    kbResults.value = response.data.items
  } catch (err) {
    if (seq !== kbRequestSeq) return
    kbError.value = messageFor(err)
  } finally {
    if (seq === kbRequestSeq) kbLoading.value = false
  }
}

function toggleKbPanel() {
  const opening = !kbPanelOpen.value
  // Seed from the ticket subject once on first expand — while the panel is
  // still closed, so this assignment does not itself trigger the watcher below.
  if (opening && !kbSeeded.value) {
    kbSeeded.value = true
    kbQuery.value = ticket.value?.subject ?? ''
  }
  kbPanelOpen.value = opening
  if (opening) loadKbResults()
}

watch(kbQuery, () => {
  if (!kbPanelOpen.value) return
  clearTimeout(kbSearchTimer)
  kbSearchTimer = setTimeout(loadKbResults, 300)
})

const ERROR_OVERRIDES = { 409: 'tickets.errors.invalidTransition', 413: 'tickets.errors.tooLarge' }
function messageFor(err: unknown): string {
  if (err instanceof ApiError && err.status === 400 && (err.details as Record<string, unknown> | undefined)?.file) {
    return t('tickets.errors.unsupportedType')
  }
  return messageForBase(err, ERROR_OVERRIDES)
}

async function loadTicket() {
  loading.value = true
  notFound.value = false
  forbidden.value = false
  loadError.value = ''

  try {
    const response = await api.get(`/tickets/${route.params.id}`)
    const loaded = {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      firstRespondedAt: response.data.firstRespondedAt ? new Date(response.data.firstRespondedAt) : null,
      resolvedAt: response.data.resolvedAt ? new Date(response.data.resolvedAt) : null,
    }
    ticket.value = loaded
    appStore.setBreadcrumbItemLabel(loaded.ticketNumber)
    editForm.subject = loaded.subject
    editForm.description = loaded.description || ''
    editForm.priorityCode = loaded.priority?.code || ''
    editForm.categoryCode = loaded.category?.code || ''
    editForm.department = loaded.department || ''

    await Promise.all([
      loadNotes(),
      loadAttachments(),
      loadHistory(),
    ])
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

async function loadNotes() {
  loadingNotes.value = true
  noteError.value = ''
  try {
    const response = await api.get(`/tickets/${route.params.id}/notes`)
    notes.value = response.data.map((n: Omit<Note, 'createdAt'> & { createdAt: string }) => ({
      ...n,
      createdAt: new Date(n.createdAt),
    }))
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
    const response = await api.get(`/tickets/${route.params.id}/attachments`)
    attachments.value = response.data.map((a: Omit<Attachment, 'createdAt'> & { createdAt: string }) => ({
      ...a,
      createdAt: new Date(a.createdAt),
    }))
  } catch (err) {
    attachmentError.value = messageFor(err)
  } finally {
    loadingAttachments.value = false
  }
}

async function loadHistory(page = 1) {
  if (page === 1) {
    loadingHistory.value = true
    history_page.value = 1
    history.value = []
  } else {
    loadingMore.value = true
  }
  historyError.value = ''
  try {
    const response = await api.get(`/tickets/${route.params.id}/history?page=${page}&pageSize=20`)
    const entries = response.data.items.map((e: Omit<HistoryEntry, 'createdAt'> & { createdAt: string }) => ({
      ...e,
      createdAt: new Date(e.createdAt),
    }))
    if (page === 1) {
      history.value = entries
    } else {
      history.value.push(...entries)
    }
    history_page.value = page
    canLoadMoreHistory.value = response.data.hasMore
  } catch (err) {
    historyError.value = messageFor(err)
  } finally {
    if (page === 1) {
      loadingHistory.value = false
    } else {
      loadingMore.value = false
    }
  }
}

async function submitEdit() {
  editError.value = ''
  editing.value = true

  try {
    await api.patch(`/tickets/${ticket.value!.id}`, {
      subject: editForm.subject,
      description: editForm.description || null,
      priorityCode: editForm.priorityCode || undefined,
      categoryCode: editForm.categoryCode || undefined,
      department: editForm.department || null,
    })
    editMode.value = false
    await loadTicket()
  } catch (err) {
    editError.value = messageFor(err)
  } finally {
    editing.value = false
  }
}

async function submitStatusTransition() {
  statusError.value = ''
  if (!statusTransitionTarget.value) {
    statusError.value = t('tickets.columns.status')
    return
  }
  updatingStatus.value = true

  try {
    await api.post(`/tickets/${ticket.value!.id}/status`, {
      targetStatus: statusTransitionTarget.value,
      note: statusTransitionNote.value || undefined,
    })
    closeStatusDialog()
    await loadTicket()
  } catch (err) {
    statusError.value = messageFor(err)
  } finally {
    updatingStatus.value = false
  }
}

async function submitAssignee() {
  assigneeError.value = ''
  if (!assigneeTransitionTarget.value) {
    assigneeError.value = t('tickets.assignee.selectAssignee')
    return
  }
  updatingAssignee.value = true

  try {
    await api.post(`/tickets/${ticket.value!.id}/assignee`, {
      assigneeId: assigneeTransitionTarget.value,
    })
    closeAssignDialog()
    await loadTicket()
  } catch (err) {
    assigneeError.value = messageFor(err)
  } finally {
    updatingAssignee.value = false
  }
}

async function submitUnassign() {
  assigneeError.value = ''
  updatingAssignee.value = true

  try {
    await api.delete(`/tickets/${ticket.value!.id}/assignee`)
    assigneeTransitionTarget.value = ''
    showAssignDialog.value = false
    await loadTicket()
  } catch (err) {
    assigneeError.value = messageFor(err)
  } finally {
    updatingAssignee.value = false
  }
}

function closeStatusDialog() {
  showStatusDialog.value = false
  statusTransitionTarget.value = ''
  statusTransitionNote.value = ''
  statusError.value = ''
}

function closeAssignDialog() {
  showAssignDialog.value = false
  assigneeTransitionTarget.value = ''
  assigneeError.value = ''
}

function openCreateNote() {
  newNoteForm.body = ''
  newNoteForm.isInternal = true
  noteFormError.value = ''
  creatingNote.value = true
}

async function submitCreateNote() {
  noteFormError.value = ''
  savingNote.value = true

  try {
    await api.post(`/tickets/${ticket.value!.id}/notes`, {
      body: newNoteForm.body,
      isInternal: newNoteForm.isInternal,
    })
    creatingNote.value = false
    await loadNotes()
  } catch (err) {
    noteFormError.value = messageFor(err)
  } finally {
    savingNote.value = false
  }
}

function confirmDeleteNote(note: Note) {
  if (confirm(t('tickets.notes.confirmDelete'))) {
    deleteNote(note.id)
  }
}

async function deleteNote(noteId: string) {
  deletingNoteId.value = noteId
  try {
    await api.delete(`/tickets/${ticket.value!.id}/notes/${noteId}`)
    await loadNotes()
  } catch (err) {
    noteError.value = messageFor(err)
  } finally {
    deletingNoteId.value = null
  }
}

async function downloadAttachment(attachment: Attachment) {
  try {
    await api.download(`/tickets/${ticket.value!.id}/attachments/${attachment.id}`)
  } catch (err) {
    attachmentError.value = messageFor(err)
  }
}

function confirmDeleteAttachment(attachment: Attachment) {
  if (confirm(t('tickets.attachments.confirmDelete'))) {
    deleteAttachment(attachment.id)
  }
}

async function deleteAttachment(attachmentId: string) {
  deletingAttachmentId.value = attachmentId
  try {
    await api.delete(`/tickets/${ticket.value!.id}/attachments/${attachmentId}`)
    await loadAttachments()
  } catch (err) {
    attachmentError.value = messageFor(err)
  } finally {
    deletingAttachmentId.value = null
  }
}

async function loadMoreHistory() {
  await loadHistory(history_page.value + 1)
}

onMounted(async () => {
  try {
    await ticketMeta.load()
    const usersRes = await api.get('/tickets/assignable-users')
    assignees.value = usersRes.data
  } catch (err) {
    loadError.value = messageFor(err)
  }
  await loadTicket()
})

onUnmounted(() => clearTimeout(kbSearchTimer))
// Clear on unmount, or the next screen's breadcrumb shows this record's name.
onUnmounted(() => appStore.setBreadcrumbItemLabel(''))
</script>

<style scoped>
.ticket-detail-view {
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

.kb-panel-toggle {
  width: 100%;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font: inherit;
  color: inherit;
  text-align: start;
}

.kb-results {
  list-style: none;
  margin: var(--spacing-3) 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.kb-results a {
  color: var(--color-primary);
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

.sla-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-4);
}

.sla-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.sla-field label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-700);
}

.hint {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
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

.textarea-input {
  width: 100%;
  min-height: 120px;
  padding: var(--spacing-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-family: monospace;
  font-size: var(--font-size-sm);
  resize: vertical;
}

.lifecycle-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-6);
}

.lifecycle-subsection {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.lifecycle-subsection h4 {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-900);
}

.select-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-700);
}

.select-field select,
.select-input {
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-family: inherit;
}

.assignee-actions {
  display: flex;
  gap: var(--spacing-2);
  flex-wrap: wrap;
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

.note.internal {
  background-color: var(--color-blue-50);
  border-color: var(--color-blue-200);
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-2);
  font-size: var(--font-size-sm);
  gap: var(--spacing-3);
}

.note-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
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

.upload-form {
  padding: var(--spacing-4);
  background-color: var(--color-gray-50);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-4);
}

.upload-info {
  margin: 0 0 var(--spacing-3) 0;
  font-size: var(--font-size-sm);
  color: var(--color-gray-700);
}

.file-input {
  display: block;
  margin-bottom: var(--spacing-3);
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

.timeline {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.timeline-entry {
  display: flex;
  gap: var(--spacing-4);
  padding: var(--spacing-3);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
}

.timeline-icon {
  font-size: var(--font-size-lg);
  min-width: 32px;
  text-align: center;
}

.timeline-content {
  flex: 1;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
  font-size: var(--font-size-sm);
  gap: var(--spacing-2);
}

.timeline-header strong {
  font-weight: var(--font-weight-semibold);
}

.timeline-body {
  font-size: var(--font-size-sm);
  color: var(--color-gray-900);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.timeline-note {
  margin-top: var(--spacing-2);
  padding: var(--spacing-2);
  background-color: var(--color-gray-100);
  border-radius: var(--radius-sm);
}

.load-more-container {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-4);
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.info-text {
  padding: var(--spacing-3);
  background-color: var(--color-primary-50);
  border-inline-start: 4px solid var(--color-primary);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-info-900);
  margin: 0;
}

.current-status,
.current-assignee {
  padding: var(--spacing-3);
  background-color: var(--color-gray-100);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-gray-900);
  margin: 0;
  border-inline-start: 4px solid var(--color-primary-200);
}

.current-status strong,
.current-assignee strong {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
}

.dialog-content .select-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  margin: 0;
}

.dialog-content .select-field select {
  width: 100%;
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  background-color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.dialog-content .select-field select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
}
</style>
