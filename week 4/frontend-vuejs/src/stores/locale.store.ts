import { defineStore } from 'pinia'
import { ref } from 'vue'
import { i18n, SUPPORTED_LOCALES, LOCALE_CONFIG, type AppLocale } from '@/i18n'

export const useLocaleStore = defineStore('locale', () => {
  const current = ref<AppLocale>('en')

  function apply(locale: AppLocale) {
    current.value = locale
    i18n.global.locale.value = locale
    const { dir, font } = LOCALE_CONFIG[locale]
    document.documentElement.setAttribute('lang', locale)
    document.documentElement.setAttribute('dir', dir)
    document.documentElement.style.setProperty('--font-family-base', font)

    try {
      localStorage.setItem('azm-crm-locale', locale)
    } catch {
      // localStorage may be unavailable in Safari private mode
    }
  }

  function initialize() {
    let saved: string | null = null
    try {
      saved = localStorage.getItem('azm-crm-locale')
    } catch {
      // localStorage may be unavailable
    }

    const detected = navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en'
    const locale = SUPPORTED_LOCALES.includes(saved as AppLocale) ? (saved as AppLocale) : detected
    apply(locale)
  }

  return { current, apply, initialize }
})
