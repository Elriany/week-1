import { ref } from 'vue'
import { api } from '@/api/client'

interface RefRow {
  id: string
  code: string
  nameEn: string
  nameAr: string
}

export interface TicketMeta {
  statuses: RefRow[]
  priorities: RefRow[]
  categories: RefRow[]
}

const EMPTY_META: TicketMeta = { statuses: [], priorities: [], categories: [] }

/**
 * Names come from the API in both languages and `useLocalizedName` picks the
 * one to render, so this payload is safe to cache across a locale switch.
 */
let cache: TicketMeta | null = null
let inFlight: Promise<{ data: TicketMeta }> | null = null

/** Test-only: clears the module-level cache so each test starts fresh. */
export function resetTicketMetaCache(): void {
  cache = null
  inFlight = null
}

export function useTicketMeta() {
  const meta = ref<TicketMeta>(cache ?? EMPTY_META)
  const loading = ref(false)
  const error = ref('')

  async function load(): Promise<void> {
    if (cache) {
      meta.value = cache
      return
    }

    // Awaits the exact promise api.get() returned — no extra .then() layer —
    // so a lone caller resolves in the same number of microtask ticks as a
    // bare `await api.get(...)` would. That tick count is load-bearing: a
    // consumer's own onMounted chain may gate other behavior (e.g. a search
    // debounce) on this call settling.
    if (!inFlight) {
      loading.value = true
      inFlight = api.get('/tickets/meta')
    }

    error.value = ''
    try {
      const response = await inFlight
      cache = response.data
      meta.value = cache!
    } catch (err) {
      error.value = 'unreachable'
      throw err
    } finally {
      inFlight = null
      loading.value = false
    }
  }

  return { meta, loading, error, load }
}
