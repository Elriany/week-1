import { ref, computed } from 'vue'

export interface TicketFilters {
  search: string
  statusId?: string
  priorityId?: string
  categoryId?: string
  assignedUserId?: string
  unassignedOnly: boolean
  slaStatus?: string
}

export interface FilterState {
  statusId?: string
  priorityId?: string
  categoryId?: string
  assignedUserId?: string
  unassignedOnly: boolean
  slaStatus?: string
}

export function useTicketFilters() {
  const search = ref('')
  const statusId = ref<string | undefined>()
  const priorityId = ref<string | undefined>()
  const categoryId = ref<string | undefined>()
  const assignedUserId = ref<string | undefined>()
  const unassignedOnly = ref(false)
  const slaStatus = ref<string | undefined>()

  const activeFilterCount = computed(() => {
    let count = 0
    if (statusId.value) count++
    if (priorityId.value) count++
    if (categoryId.value) count++
    if (assignedUserId.value) count++
    if (unassignedOnly.value) count++
    if (slaStatus.value) count++
    return count
  })

  const hasActiveFilters = computed(() => activeFilterCount.value > 0)

  const clearAllFilters = () => {
    search.value = ''
    statusId.value = undefined
    priorityId.value = undefined
    categoryId.value = undefined
    assignedUserId.value = undefined
    unassignedOnly.value = false
    slaStatus.value = undefined
  }

  const filters = computed((): TicketFilters => ({
    search: search.value,
    statusId: statusId.value,
    priorityId: priorityId.value,
    categoryId: categoryId.value,
    assignedUserId: assignedUserId.value,
    unassignedOnly: unassignedOnly.value,
    slaStatus: slaStatus.value,
  }))

  return {
    search,
    statusId,
    priorityId,
    categoryId,
    assignedUserId,
    unassignedOnly,
    slaStatus,
    filters,
    activeFilterCount,
    hasActiveFilters,
    clearAllFilters,
  }
}
