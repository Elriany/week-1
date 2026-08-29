import { TICKET_STATUS_CODES, type TicketStatusCode } from '../tickets/ticket.constants';

/**
 * A ticket is "open" until it is RESOLVED or CLOSED. This is the single
 * definition used by the agent dashboard, the management report, and every
 * drill-down filter. Do not re-derive it anywhere else.
 */
export const CLOSED_STATUS_CODES: TicketStatusCode[] = [
  TICKET_STATUS_CODES.RESOLVED,
  TICKET_STATUS_CODES.CLOSED,
];

export const OPEN_STATUS_CODES: TicketStatusCode[] = (
  Object.values(TICKET_STATUS_CODES) as TicketStatusCode[]
).filter(c => !CLOSED_STATUS_CODES.includes(c));

/** Agents listed on the workload panel, highest open count first. */
export const WORKLOAD_TOP_N = 10;
