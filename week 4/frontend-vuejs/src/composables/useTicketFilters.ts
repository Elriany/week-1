import { ref, computed } from 'vue'

export interface TicketFilters {
  search: string
  statusId?: string
  priorityId?: string
  categoryId?: string
  assigneeId?: string
  unassignedOnly: boolean
}

export interface FilterState {
  statusId?: string
  priorityId?: string
  categoryId?: string
  assigneeId?: string
  unassignedOnly: boolean
}

export function useTicketFilters() {
  const search = ref('')
  const statusId = ref<string | undefined>()
  const priorityId = ref<string | undefined>()
  const categoryId = ref<string | undefined>()
  const assigneeId = ref<string | undefined>()
  const unassignedOnly = ref(false)

  const activeFilterCount = computed(() => {
    let count = 0
    if (statusId.value) count++
    if (priorityId.value) count++
    if (categoryId.value) count++
    if (assigneeId.value) count++
    if (unassignedOnly.value) count++
    return count
  })

  const hasActiveFilters = computed(() => activeFilterCount.value > 0)

  const clearAllFilters = () => {
    search.value = ''
    statusId.value = undefined
    priorityId.value = undefined
    categoryId.value = undefined
    assigneeId.value = undefined
    unassignedOnly.value = false
  }

  const filters = computed((): TicketFilters => ({
    search: search.value,
    statusId: statusId.value,
    priorityId: priorityId.value,
    categoryId: categoryId.value,
    assigneeId: assigneeId.value,
    unassignedOnly: unassignedOnly.value,
  }))

  return {
    search,
    statusId,
    priorityId,
    categoryId,
    assigneeId,
    unassignedOnly,
    filters,
    activeFilterCount,
    hasActiveFilters,
    clearAllFilters,
  }
}
