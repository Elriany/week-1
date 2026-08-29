import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SlaBadge from '../SlaBadge.vue'
import { i18n } from '@/i18n'

function mountBadge(sla: { status: string } | null) {
  return mount(SlaBadge, {
    props: { sla: sla as any },
    global: { plugins: [i18n] },
  })
}

describe('SlaBadge', () => {
  it('renders nothing when sla is null', () => {
    const wrapper = mountBadge(null)
    expect(wrapper.find('.base-badge').exists()).toBe(false)
  })

  it.each([
    ['ON_TRACK', 'variant-success'],
    ['AT_RISK', 'variant-warning'],
    ['BREACHED', 'variant-danger'],
    ['MET', 'variant-gray'],
  ])('maps %s to its documented badge variant', (status, expectedClass) => {
    const wrapper = mountBadge({ status })
    expect(wrapper.find(`.${expectedClass}`).exists()).toBe(true)
  })

  it('labels from tickets.sla.status.<STATUS> and changes with the locale', () => {
    i18n.global.locale.value = 'en'
    let wrapper = mountBadge({ status: 'BREACHED' })
    expect(wrapper.text()).toBe('Breached')

    i18n.global.locale.value = 'ar'
    wrapper = mountBadge({ status: 'BREACHED' })
    expect(wrapper.text()).toBe('مخالف')
    i18n.global.locale.value = 'en'
  })
})
