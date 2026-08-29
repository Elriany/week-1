import type { BadgeVariant } from '@/types/ui'

/**
 * Ticket status and priority codes are fixed in `ticket.constants.ts` on the
 * server and are rename-only, so mapping them to a badge variant is a lookup,
 * not configuration. One copy, so the tickets list and the ticket detail screen
 * can never colour the same ticket differently.
 */
const PRIORITY_VARIANTS: Record<string, BadgeVariant> = {
  URGENT: 'danger',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'success',
}

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  NEW: 'info',
  ASSIGNED: 'info',
  IN_PROGRESS: 'warning',
  PENDING_CUSTOMER: 'warning',
  RESOLVED: 'success',
  CLOSED: 'gray',
}

/** Falls back to grey for a code the admin screens added after this map. */
export function priorityVariant(code?: string): BadgeVariant {
  return PRIORITY_VARIANTS[code ?? ''] ?? 'gray'
}

export function statusVariant(code?: string): BadgeVariant {
  return STATUS_VARIANTS[code ?? ''] ?? 'gray'
}
