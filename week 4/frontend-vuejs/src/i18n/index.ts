import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import ar from './locales/ar.json'

export const SUPPORTED_LOCALES = ['en', 'ar'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const LOCALE_CONFIG: Record<AppLocale, { name: string; dir: 'ltr' | 'rtl'; font: string }> = {
  en: { name: 'English', dir: 'ltr', font: "'Inter', system-ui, sans-serif" },
  ar: { name: 'العربية', dir: 'rtl', font: "'Cairo', 'Tajawal', system-ui, sans-serif" },
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, ar },
})
