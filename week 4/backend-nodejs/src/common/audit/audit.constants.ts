/** What happened. One flat list across every module — the log is cross-cutting. */
export const AUDIT_ACTIONS = {
  TICKET_CREATED: 'TICKET_CREATED',
  TICKET_STATUS_CHANGED: 'TICKET_STATUS_CHANGED',
  TICKET_ASSIGNED: 'TICKET_ASSIGNED',
  TICKET_UNASSIGNED: 'TICKET_UNASSIGNED',
  TICKET_PRIORITY_CHANGED: 'TICKET_PRIORITY_CHANGED',
  CONFIG_CREATED: 'CONFIG_CREATED',
  CONFIG_UPDATED: 'CONFIG_UPDATED',
  CONFIG_DEACTIVATED: 'CONFIG_DEACTIVATED',
  KB_ARTICLE_PUBLISHED: 'KB_ARTICLE_PUBLISHED',
  KB_ARTICLE_UNPUBLISHED: 'KB_ARTICLE_UNPUBLISHED',
  SLA_POLICY_UPDATED: 'SLA_POLICY_UPDATED',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const AUDIT_ENTITY_TYPES = {
  TICKET: 'Ticket',
  BRANCH: 'Branch',
  DEPARTMENT: 'Department',
  TICKET_CATEGORY: 'TicketCategory',
  TICKET_PRIORITY: 'TicketPriority',
  TICKET_STATUS: 'TicketStatus',
  KB_ARTICLE: 'KbArticle',
  KB_CATEGORY: 'KbCategory',
  SLA_POLICY: 'SlaPolicy',
  // The one documented exception to Story 15's "add no new audit constants"
  // rule — Story 20's customer-link action has no other entity type to use.
  USER: 'User',
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[keyof typeof AUDIT_ENTITY_TYPES];

/** Details are truncated, not rejected — a long payload must not fail the action. */
export const AUDIT_DETAILS_MAX = 2000;
