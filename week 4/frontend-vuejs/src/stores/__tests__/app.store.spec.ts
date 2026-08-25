import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '../app.store'

describe('app store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('toggleSidebar flips sidebarOpen state', () => {
    const store = useAppStore()
    const initial = store.sidebarOpen
    store.toggleSidebar()
    expect(store.sidebarOpen).toBe(!initial)
  })

  it('setSidebarOpen sets sidebarOpen to specific value', () => {
    const store = useAppStore()
    store.setSidebarOpen(false)
    expect(store.sidebarOpen).toBe(false)
    store.setSidebarOpen(true)
    expect(store.sidebarOpen).toBe(true)
  })

  it('has initial isLoading state', () => {
    const store = useAppStore()
    expect(store.isLoading).toBeDefined()
  })
})
