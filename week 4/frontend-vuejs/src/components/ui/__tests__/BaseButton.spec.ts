import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseButton from '../BaseButton.vue'
import { i18n } from '@/i18n'

describe('BaseButton', () => {
  it('renders slot content', () => {
    const wrapper = mount(BaseButton, {
      props: { type: 'button' },
      slots: {
        default: 'Click me',
      },
      global: {
        plugins: [i18n],
      },
    })

    expect(wrapper.text()).toContain('Click me')
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(BaseButton, {
      props: { type: 'button' },
      slots: { default: 'Click' },
      global: { plugins: [i18n] },
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('does not emit click when disabled', async () => {
    const wrapper = mount(BaseButton, {
      props: { type: 'button', disabled: true },
      slots: { default: 'Click' },
      global: { plugins: [i18n] },
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('shows spinner and sets aria-busy when loading', () => {
    const wrapper = mount(BaseButton, {
      props: { type: 'button', loading: true },
      slots: { default: 'Save' },
      global: { plugins: [i18n] },
    })

    const button = wrapper.find('button')
    expect(button.attributes('aria-busy')).toBe('true')
  })

  it('applies correct variant class', () => {
    const wrapper = mount(BaseButton, {
      props: { type: 'button', variant: 'danger' },
      slots: { default: 'Delete' },
      global: { plugins: [i18n] },
    })

    expect(wrapper.find('button').classes()).toContain('variant-danger')
  })
})
