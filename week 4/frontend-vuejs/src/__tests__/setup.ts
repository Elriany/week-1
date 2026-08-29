import { beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'

// Reset locale and localStorage before each test
beforeEach(() => {
  const pinia = createPinia()
  setActivePinia(pinia)
  i18n.global.locale.value = 'en'
  localStorage.clear()
  document.documentElement.lang = 'en'
  document.documentElement.dir = 'ltr'
  document.documentElement.style.setProperty('--font-family-base', "'Inter', system-ui, sans-serif")
})

afterEach(() => {
  localStorage.clear()
  document.documentElement.lang = 'en'
  document.documentElement.dir = 'ltr'
})
