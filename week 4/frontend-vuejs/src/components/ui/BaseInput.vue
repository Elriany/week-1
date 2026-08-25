<template>
  <div class="base-input">
    <label v-if="label" :for="inputId">{{ label }}</label>
    <input
      :id="inputId"
      :value="modelValue"
      :type="type"
      :required="required"
      :disabled="disabled"
      :autocomplete="autocomplete"
      :dir="dir"
      :aria-invalid="Boolean(error)"
      @input="onInput"
    />
    <span v-if="error" class="error">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'

interface Props {
  modelValue?: string
  type?: string
  label?: string
  error?: string
  required?: boolean
  disabled?: boolean
  autocomplete?: string
  /**
   * Force text direction for fields whose content is always Latin (email,
   * password, URLs) so the caret and placeholder sit correctly inside an RTL form.
   */
  dir?: 'ltr' | 'rtl' | 'auto'
}

withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  required: false,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

const inputId = computed(() => `input-${useId()}`)
</script>

<style scoped>
.base-input {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

label {
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-700);
  font-size: var(--font-size-sm);
}

input {
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  transition: all var(--transition-base);
}

input:hover:not(:disabled) {
  border-color: var(--color-gray-400);
}

input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

input:disabled {
  background-color: var(--color-gray-100);
  cursor: not-allowed;
}

.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
</style>
