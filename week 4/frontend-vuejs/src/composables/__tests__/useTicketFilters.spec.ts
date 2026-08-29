import { describe, it, expect } from 'vitest'
import { useTicketFilters } from '../useTicketFilters'

describe('useTicketFilters', () => {
  it('setting slaStatus increments activeFilterCount', () => {
    const { slaStatus, activeFilterCount } = useTicketFilters()
    expect(activeFilterCount.value).toBe(0)
    slaStatus.value = 'BREACHED'
    expect(activeFilterCount.value).toBe(1)
  })

  it('clearAllFilters resets slaStatus to undefined along with every other filter', () => {
    const { statusId, priorityId, categoryId, assignedUserId, unassignedOnly, slaStatus, clearAllFilters } = useTicketFilters()
    statusId.value = 's1'
    priorityId.value = 'p1'
    categoryId.value = 'c1'
    assignedUserId.value = 'u1'
    unassignedOnly.value = true
    slaStatus.value = 'BREACHED'

    clearAllFilters()

    expect(statusId.value).toBeUndefined()
    expect(priorityId.value).toBeUndefined()
    expect(categoryId.value).toBeUndefined()
    expect(assignedUserId.value).toBeUndefined()
    expect(unassignedOnly.value).toBe(false)
    expect(slaStatus.value).toBeUndefined()
  })

  it('filters exposes slaStatus', () => {
    const { slaStatus, filters } = useTicketFilters()
    slaStatus.value = 'AT_RISK'
    expect(filters.value.slaStatus).toBe('AT_RISK')
  })
})
