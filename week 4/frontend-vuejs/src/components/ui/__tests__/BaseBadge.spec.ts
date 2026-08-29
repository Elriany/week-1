import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseBadge from '../BaseBadge.vue'
import type { BadgeVariant } from '@/types/ui'

const VARIANTS: BadgeVariant[] = ['primary', 'info', 'success', 'danger', 'warning', 'gray']

describe('BaseBadge', () => {
  it.each(VARIANTS)('renders the %s variant class', (variant) => {
    const wrapper = mount(BaseBadge, { props: { variant, label: 'Test' } })

    expect(wrapper.classes()).toContain('base-badge')
    expect(wrapper.classes()).toContain(`variant-${variant}`)
  })

  it('defaults to the primary variant', () => {
    const wrapper = mount(BaseBadge, { props: { label: 'Test' } })

    expect(wrapper.classes()).toContain('variant-primary')
  })

  it('renders its label', () => {
    const wrapper = mount(BaseBadge, { props: { label: 'In Progress' } })

    expect(wrapper.text()).toBe('In Progress')
  })

  // `primary` (an identity chip, e.g. the topbar role) and `info` (a ticket
  // status) used to resolve to the same two colours, so the two kinds of badge
  // were indistinguishable. Different classes AND different tokens.
  it('gives primary and info distinct classes', () => {
    const primary = mount(BaseBadge, { props: { variant: 'primary', label: 'x' } })
    const info = mount(BaseBadge, { props: { variant: 'info', label: 'x' } })

    expect(primary.classes()).not.toEqual(info.classes())
  })
})
