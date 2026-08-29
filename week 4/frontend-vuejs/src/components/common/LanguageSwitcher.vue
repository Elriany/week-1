<template>
  <button
    class="language-switcher"
    :aria-label="t('action.switchLanguage')"
    @click="toggleLanguage"
  >
    {{ targetLanguageName }}
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocaleStore } from '@/stores/locale.store'
import { LOCALE_CONFIG } from '@/i18n'

const { locale, t } = useI18n()
const localeStore = useLocaleStore()

const targetLocale = computed(() => (locale.value === 'en' ? 'ar' : 'en'))
const targetLanguageName = computed(() => LOCALE_CONFIG[targetLocale.value].name)

function toggleLanguage() {
  localeStore.apply(targetLocale.value)
}
</script>

<style scoped>
.language-switcher {
  padding: var(--spacing-2) var(--spacing-3);
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: background-color var(--transition-base);
}

.language-switcher:hover {
  background-color: var(--color-primary);
}

.language-switcher:active {
  transform: scale(0.98);
}
</style>
