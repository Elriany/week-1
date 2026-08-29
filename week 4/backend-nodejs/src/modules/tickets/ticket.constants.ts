/**
 * The six lifecycle states from the work item's acceptance criteria, in order.
 * `OPEN` and `PENDING` from the Story 02 seed are retired by migration
 * 1760000000000 and must not reappear here.
 */
export const TICKET_STATUS_CODES = {
  NEW: 'NEW',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING_CUSTOMER: 'PENDING_CUSTOMER',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const;

export type TicketStatusCode = (typeof TICKET_STATUS_CODES)[keyof typeof TICKET_STATUS_CODES];

export const TICKET_STATUS_CATALOGUE: Array<{
  code: TicketStatusCode;
  nameEn: string;
  nameAr: string;
  sortOrder: number;
}> = [
  { code: 'NEW', nameEn: 'New', nameAr: 'جديد', sortOrder: 0 },
  { code: 'ASSIGNED', nameEn: 'Assigned', nameAr: 'مُسند', sortOrder: 1 },
  { code: 'IN_PROGRESS', nameEn: 'In Progress', nameAr: 'قيد التنفيذ', sortOrder: 2 },
  { code: 'PENDING_CUSTOMER', nameEn: 'Pending Customer', nameAr: 'بانتظار العميل', sortOrder: 3 },
  { code: 'RESOLVED', nameEn: 'Resolved', nameAr: 'تم الحل', sortOrder: 4 },
  { code: 'CLOSED', nameEn: 'Closed', nameAr: 'مغلق', sortOrder: 5 },
];

export const TICKET_CATEGORY_CATALOGUE = [
  { code: 'TECHNICAL', nameEn: 'Technical Issue', nameAr: 'مشكلة تقنية', sortOrder: 0 },
  { code: 'BILLING', nameEn: 'Billing', nameAr: 'الفوترة', sortOrder: 1 },
  { code: 'ACCOUNT', nameEn: 'Account', nameAr: 'الحساب', sortOrder: 2 },
  { code: 'COMPLAINT', nameEn: 'Complaint', nameAr: 'شكوى', sortOrder: 3 },
  { code: 'GENERAL', nameEn: 'General Enquiry', nameAr: 'استفسار عام', sortOrder: 4 },
];

/**
 * How a ticket reached the CRM. Only WEB is produced by any flow in this
 * feature — PHONE and EMAIL exist so an agent-entered or future ingested ticket
 * has a value to carry, not because any transport is implemented. Adding a real
 * channel means adding an intake service; this list does not change.
 */
export const TICKET_CHANNELS = {
  WEB: 'WEB',
  PHONE: 'PHONE',
  EMAIL: 'EMAIL',
} as const;

export type TicketChannel = (typeof TICKET_CHANNELS)[keyof typeof TICKET_CHANNELS];

export const DEFAULT_TICKET_CHANNEL: TicketChannel = TICKET_CHANNELS.WEB;

/**
 * Ticket status transition graph. Maps fromStatus -> list of allowable toStatuses.
 * CLOSED is terminal (no outgoing edges).
 */
export const TICKET_TRANSITIONS: Record<TicketStatusCode, TicketStatusCode[]> = {
  NEW: ['ASSIGNED', 'IN_PROGRESS', 'CLOSED'],
  ASSIGNED: ['IN_PROGRESS', 'PENDING_CUSTOMER', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['ASSIGNED', 'PENDING_CUSTOMER', 'RESOLVED', 'CLOSED'],
  PENDING_CUSTOMER: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

/**
 * Returns true if transitioning from one status code to another is allowed.
 */
export function canTransition(fromCode: TicketStatusCode, toCode: TicketStatusCode): boolean {
  return TICKET_TRANSITIONS[fromCode]?.includes(toCode) ?? false;
}

/**
 * History action types: what changes are recorded in the audit trail.
 */
export const TICKET_HISTORY_ACTIONS = {
  CREATED: 'CREATED',
  ASSIGNED: 'ASSIGNED',
  UNASSIGNED: 'UNASSIGNED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  PRIORITY_CHANGED: 'PRIORITY_CHANGED',
} as const;

export type TicketHistoryAction = (typeof TICKET_HISTORY_ACTIONS)[keyof typeof TICKET_HISTORY_ACTIONS];
