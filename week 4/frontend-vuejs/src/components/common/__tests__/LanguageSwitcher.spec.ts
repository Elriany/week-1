import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LanguageSwitcher from '../LanguageSwitcher.vue'
import { i18n } from '@/i18n'

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
  })

  it('renders the target language label', () => {
    const wrapper = mount(LanguageSwitcher, {
      global: {
        plugins: [i18n, createPinia()],
      },
    })

    expect(wrapper.text()).toContain('العربية')
  })

  it('shows English label when in Arabic', async () => {
    i18n.global.locale.value = 'ar'

    const wrapper = mount(LanguageSwitcher, {
      global: {
        plugins: [i18n, createPinia()],
      },
    })

    expect(wrapper.text()).toContain('English')
  })

  it('calls apply with other locale on click', async () => {
    const wrapper = mount(LanguageSwitcher, {
      global: {
        plugins: [i18n, createPinia()],
      },
    })

    await wrapper.find('button').trigger('click')
    expect(i18n.global.locale.value).toBe('ar')
  })

  it('has an aria-label', () => {
    const wrapper = mount(LanguageSwitcher, {
      global: {
        plugins: [i18n, createPinia()],
      },
    })

    expect(wrapper.find('button').attributes('aria-label')).toBeDefined()
  })
})
