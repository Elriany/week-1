import { describe, it, expect } from 'vitest'
import { priorityVariant, statusVariant } from '../ticketBadges'

describe('ticketBadges', () => {
  it.each([
    ['URGENT', 'danger'],
    ['HIGH', 'warning'],
    ['MEDIUM', 'info'],
    ['LOW', 'success'],
  ])('maps priority %s to %s', (code, expected) => {
    expect(priorityVariant(code)).toBe(expected)
  })

  it.each([
    ['NEW', 'info'],
    ['ASSIGNED', 'info'],
    ['IN_PROGRESS', 'warning'],
    ['PENDING_CUSTOMER', 'warning'],
    ['RESOLVED', 'success'],
    ['CLOSED', 'gray'],
  ])('maps status %s to %s', (code, expected) => {
    expect(statusVariant(code)).toBe(expected)
  })

  // A priority or status added through the admin screens has no entry here. Grey
  // with the real name beats a crash or a misleading colour.
  it('falls back to gray for an unknown code', () => {
    expect(priorityVariant('INVENTED')).toBe('gray')
    expect(statusVariant('INVENTED')).toBe('gray')
  })

  it('falls back to gray for undefined and empty', () => {
    expect(priorityVariant(undefined)).toBe('gray')
    expect(statusVariant(undefined)).toBe('gray')
    expect(priorityVariant('')).toBe('gray')
    expect(statusVariant('')).toBe('gray')
  })
})
