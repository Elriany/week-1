/**
 * Simplified SLA states. Computed on read from the policy and the ticket's
 * timestamps — nothing is stored. Wall-clock minutes only: business hours,
 * holidays, and time-zone-aware calendars are deliberately out of scope.
 */
export const SLA_STATUSES = {
  ON_TRACK: 'ON_TRACK',
  AT_RISK: 'AT_RISK',
  BREACHED: 'BREACHED',
  MET: 'MET',
} as const;

export type SlaStatus = (typeof SLA_STATUSES)[keyof typeof SLA_STATUSES];

/** Fraction of a target that must elapse before a live clock reads AT_RISK. */
export const SLA_AT_RISK_RATIO = 0.8;

/** Defaults seeded per priority code. Minutes, wall-clock. */
export const SLA_POLICY_DEFAULTS: Array<{
  priorityCode: string;
  responseTargetMinutes: number;
  resolutionTargetMinutes: number;
}> = [
  { priorityCode: 'URGENT', responseTargetMinutes: 30, resolutionTargetMinutes: 240 },
  { priorityCode: 'HIGH', responseTargetMinutes: 60, resolutionTargetMinutes: 480 },
  { priorityCode: 'MEDIUM', responseTargetMinutes: 240, resolutionTargetMinutes: 1440 },
  { priorityCode: 'LOW', responseTargetMinutes: 480, resolutionTargetMinutes: 2880 },
];
