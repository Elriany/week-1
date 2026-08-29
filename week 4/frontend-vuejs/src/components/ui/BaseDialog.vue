<template>
  <teleport to="body">
    <transition name="dialog-fade">
      <div v-if="isOpen" class="dialog-backdrop" @click="closeOnBackdrop && closeDialog()">
        <div
          ref="contentRef"
          class="dialog-content"
          role="dialog"
          :aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          @click.stop
        >
          <div class="dialog-header">
            <h2 :id="titleId">{{ title }}</h2>
            <button
              type="button"
              class="close-button"
              :aria-label="t('common.closeDialog')"
              @click="closeDialog()"
            >
              ✕
            </button>
          </div>
          <div class="dialog-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="dialog-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { useId, ref, watch, nextTick, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
  isOpen: boolean
  title: string
  closeOnBackdrop?: boolean
}

interface Emits {
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  closeOnBackdrop: true,
})

const emit = defineEmits<Emits>()

const { t } = useI18n()
const titleId = useId()
const contentRef = ref<HTMLElement | null>(null)
/** The element focus came from, so closing can hand it back. */
let opener: Element | null = null

const closeDialog = () => {
  emit('close')
}

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function tabbables(): HTMLElement[] {
  if (!contentRef.value) return []
  return Array.from(contentRef.value.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  )
}

function trapFocus(e: KeyboardEvent) {
  const items = tabbables()
  if (items.length === 0) {
    // Nothing to cycle between; keep focus on the dialog itself.
    e.preventDefault()
    contentRef.value?.focus()
    return
  }
  const first = items[0]!
  const last = items[items.length - 1]!
  const active = document.activeElement

  if (e.shiftKey && (active === first || active === contentRef.value)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

function onKeydown(e: KeyboardEvent) {
  // Escape has no opt-out, unlike closeOnBackdrop: a dialog that refuses a
  // backdrop click guards against a misclick, one that refuses Escape is a trap.
  if (e.key === 'Escape') {
    closeDialog()
    return
  }
  if (e.key === 'Tab') trapFocus(e)
}

function stopListening() {
  document.removeEventListener('keydown', onKeydown)
}

watch(
  () => props.isOpen,
  async (open) => {
    if (open) {
      opener = document.activeElement
      document.addEventListener('keydown', onKeydown)
      // The dialog teleports to body, so the query has to run after it lands.
      await nextTick()
      const items = tabbables()
      ;(items[0] ?? contentRef.value)?.focus()
    } else {
      stopListening()
      // The opener can be gone — a dialog that deleted the row it hung off.
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus()
      opener = null
    }
  },
)

onUnmounted(stopListening)
</script>

<style scoped>
.dialog-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-4);
}

.dialog-content {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.2s ease-out;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4);
  border-bottom: 1px solid var(--color-gray-200);
  flex-shrink: 0;
}

.dialog-header h2 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-900);
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-gray-500);
  transition: all 0.2s;
}

.close-button:hover {
  background-color: var(--color-gray-100);
  color: var(--color-gray-900);
}

.dialog-body {
  padding: var(--spacing-4);
  flex: 1;
  overflow-y: auto;
}

.dialog-footer {
  padding: var(--spacing-4);
  border-top: 1px solid var(--color-gray-200);
  display: flex;
  gap: var(--spacing-2);
  flex-wrap: wrap;
  justify-content: flex-end;
  flex-shrink: 0;
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

/* No [dir='rtl'] overrides here on purpose: the dialog sits inside an
   rtl document, so the header flex row and its space-between already lay out
   right-to-left. Reversing again put the close button back beside the title. */

/* Animations */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mobile */
@media (max-width: 640px) {
  .dialog-backdrop {
    padding: 0;
  }

  .dialog-content {
    max-width: 100%;
    max-height: 100%;
    border-radius: 0;
    animation: slideUp 0.3s ease-out;
  }
}
</style>
