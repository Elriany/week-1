<template>
  <teleport to="body">
    <transition
      name="dialog-fade"
      @click="isOpen && closeOnBackdrop && closeDialog()"
    >
      <div v-if="isOpen" class="dialog-backdrop" @click="closeOnBackdrop && closeDialog()">
        <div class="dialog-content" role="dialog" :aria-modal="true" :aria-labelledby="titleId" @click.stop>
          <div class="dialog-header">
            <h2 :id="titleId">{{ title }}</h2>
            <button
              type="button"
              class="close-button"
              aria-label="Close dialog"
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
import { computed } from 'vue'

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

const titleId = computed(() => `dialog-title-${Math.random().toString(36).slice(2, 9)}`)

const closeDialog = () => {
  emit('close')
}
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
  background-color: white;
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

/* RTL Support */
:global([dir='rtl']) .dialog-header {
  flex-direction: row-reverse;
}

:global([dir='rtl']) .close-button {
  margin-right: auto;
}

:global([dir='rtl']) .dialog-footer {
  justify-content: flex-start;
}

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
  }

  .dialog-content {
    animation: slideUp 0.3s ease-out;
  }
}
</style>
