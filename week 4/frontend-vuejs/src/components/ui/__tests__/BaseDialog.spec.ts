import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import BaseDialog from '../BaseDialog.vue'
import { i18n } from '@/i18n'

function mountDialog(props: Record<string, unknown> = {}) {
  return mount(BaseDialog, {
    attachTo: document.body,
    props: { isOpen: false, title: 'Test dialog', ...props },
    slots: { default: '<button class="inner-a">A</button><button class="inner-b">B</button>' },
    global: { plugins: [i18n] },
  })
}

function press(key: string, shiftKey = false) {
  const e = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true })
  document.dispatchEvent(e)
  return e
}

describe('BaseDialog', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en'
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('emits close on Escape', async () => {
    const wrapper = mountDialog()
    await wrapper.setProps({ isOpen: true })
    await flushPromises()

    press('Escape')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  // closeOnBackdrop guards against a misclick. A dialog that refuses Escape is
  // a trap, so Escape deliberately has no opt-out.
  it('emits close on Escape even when closeOnBackdrop is false', async () => {
    const wrapper = mountDialog({ closeOnBackdrop: false })
    await wrapper.setProps({ isOpen: true })
    await flushPromises()

    press('Escape')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('does not listen while closed', async () => {
    const wrapper = mountDialog()
    press('Escape')

    expect(wrapper.emitted('close')).toBeFalsy()
  })

  it('moves focus into the dialog on open', async () => {
    const wrapper = mountDialog()
    await wrapper.setProps({ isOpen: true })
    await flushPromises()

    const content = document.querySelector('.dialog-content')
    expect(content?.contains(document.activeElement)).toBe(true)
  })

  it('returns focus to the opener on close', async () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    expect(document.activeElement).toBe(opener)

    const wrapper = mountDialog()
    await wrapper.setProps({ isOpen: true })
    await flushPromises()
    await wrapper.setProps({ isOpen: false })
    await flushPromises()

    expect(document.activeElement).toBe(opener)
  })

  it('wraps Tab from the last tabbable back to the first', async () => {
    const wrapper = mountDialog()
    await wrapper.setProps({ isOpen: true })
    await flushPromises()

    const items = Array.from(
      document.querySelectorAll<HTMLElement>('.dialog-content button'),
    )
    const last = items[items.length - 1]!
    last.focus()

    const e = press('Tab')

    expect(e.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(items[0])
  })

  it('wraps Shift+Tab from the first tabbable to the last', async () => {
    const wrapper = mountDialog()
    await wrapper.setProps({ isOpen: true })
    await flushPromises()

    const items = Array.from(
      document.querySelectorAll<HTMLElement>('.dialog-content button'),
    )
    items[0]!.focus()

    const e = press('Tab', true)

    expect(e.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(items[items.length - 1])
  })

  it('localises the close button label', async () => {
    const wrapper = mountDialog()
    await wrapper.setProps({ isOpen: true })
    await flushPromises()

    const close = document.querySelector('.close-button')
    expect(close?.getAttribute('aria-label')).toBe('Close dialog')

    i18n.global.locale.value = 'ar'
    await flushPromises()
    expect(document.querySelector('.close-button')?.getAttribute('aria-label')).not.toBe(
      'Close dialog',
    )
  })

  it('stops listening once closed', async () => {
    const wrapper = mountDialog()
    await wrapper.setProps({ isOpen: true })
    await flushPromises()
    await wrapper.setProps({ isOpen: false })
    await flushPromises()

    const before = wrapper.emitted('close')?.length ?? 0
    press('Escape')

    expect(wrapper.emitted('close')?.length ?? 0).toBe(before)
  })
})
