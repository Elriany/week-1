import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLocaleStore } from '../locale.store'
import { i18n } from '@/i18n'

describe('locale store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    document.documentElement.lang = 'en'
    document.documentElement.dir = 'ltr'
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('apply sets lang attribute on documentElement', () => {
    const store = useLocaleStore()
    store.apply('ar')

    expect(document.documentElement.getAttribute('lang')).toBe('ar')
  })

  it('apply sets dir attribute to rtl for Arabic', () => {
    const store = useLocaleStore()
    store.apply('ar')

    expect(document.documentElement.getAttribute('dir')).toBe('rtl')
  })

  it('apply sets dir attribute to ltr for English', () => {
    const store = useLocaleStore()
    store.apply('en')

    expect(document.documentElement.getAttribute('dir')).toBe('ltr')
  })

  it('apply persists locale to localStorage', () => {
    const store = useLocaleStore()
    store.apply('ar')

    expect(localStorage.getItem('azm-crm-locale')).toBe('ar')
  })

  it('initialize uses persisted locale', () => {
    localStorage.setItem('azm-crm-locale', 'ar')
    const store = useLocaleStore()
    store.initialize()

    expect(store.current).toBe('ar')
    expect(document.documentElement.getAttribute('lang')).toBe('ar')
  })

  it('initialize rejects invalid persisted value', () => {
    localStorage.setItem('azm-crm-locale', 'invalid-locale')
    const store = useLocaleStore()
    store.initialize()

    // Should fall back to detected or default
    expect(['ar', 'en']).toContain(store.current)
  })

  it('handles localStorage unavailability gracefully', () => {
    const store = useLocaleStore()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full')
    })

    expect(() => {
      store.apply('ar')
    }).not.toThrow()
  })
})
