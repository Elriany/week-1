import { AppDataSource } from '../../config/data-source';
import { NotFoundError } from '../../common/errors/AppError';
import { SlaPolicy } from './slaPolicy.entity';
import { TicketPriority } from '../tickets/ticketPriority.entity';
import type { Ticket } from '../tickets/ticket.entity';
import { recordAudit } from '../../common/audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../../common/audit/audit.constants';
import { SLA_STATUSES, SLA_AT_RISK_RATIO, type SlaStatus } from './sla.constants';

export interface SlaSnapshot {
  status: SlaStatus;
  responseTargetMinutes: number;
  resolutionTargetMinutes: number;
  responseDueAt: Date;
  resolutionDueAt: Date;
  respondedAt: Date | null;
  resolvedAt: Date | null;
  /** Negative when the deadline has passed. Null once the clock has stopped. */
  minutesToResponseDue: number | null;
  minutesToResolutionDue: number | null;
}

export interface SlaPolicyInput {
  responseTargetMinutes: number;
  resolutionTargetMinutes: number;
  isActive?: boolean;
}

export interface PublicSlaPolicy {
  id: string;
  priorityId: string;
  priority: { id: string; code: string; nameEn: string; nameAr: string } | null;
  responseTargetMinutes: number;
  resolutionTargetMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const STATUS_RANK: Record<SlaStatus, number> = {
  [SLA_STATUSES.BREACHED]: 3,
  [SLA_STATUSES.AT_RISK]: 2,
  [SLA_STATUSES.ON_TRACK]: 1,
  [SLA_STATUSES.MET]: 0,
};

function worse(a: SlaStatus, b: SlaStatus): SlaStatus {
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function clockStatus(
  now: Date,
  createdAt: Date,
  targetMinutes: number,
  stoppedAt: Date | null | undefined,
): SlaStatus {
  const dueAt = addMinutes(createdAt, targetMinutes);
  if (stoppedAt) {
    return stoppedAt.getTime() <= dueAt.getTime() ? SLA_STATUSES.MET : SLA_STATUSES.BREACHED;
  }
  if (now.getTime() > dueAt.getTime()) return SLA_STATUSES.BREACHED;
  const atRiskAt = addMinutes(createdAt, targetMinutes * SLA_AT_RISK_RATIO);
  if (now.getTime() >= atRiskAt.getTime()) return SLA_STATUSES.AT_RISK;
  return SLA_STATUSES.ON_TRACK;
}

/**
 * Pure — no database access. This is deliberate: it is what lets the unit
 * tests cover the whole SLA state matrix without a live database, and it is
 * the one place "what does BREACHED mean" is defined.
 */
export function computeSla(
  ticket: Pick<Ticket, 'createdAt' | 'firstRespondedAt' | 'resolvedAt'>,
  policy: Pick<SlaPolicy, 'responseTargetMinutes' | 'resolutionTargetMinutes' | 'isActive'> | null,
  now: Date = new Date(),
): SlaSnapshot | null {
  if (!policy || !policy.isActive) return null;

  const responseDueAt = addMinutes(ticket.createdAt, policy.responseTargetMinutes);
  const resolutionDueAt = addMinutes(ticket.createdAt, policy.resolutionTargetMinutes);

  // A resolved ticket with no response yet is a response breach — the clock
  // never stopped, so it is evaluated as still running against a stopped ticket.
  const responseStatus = ticket.resolvedAt && !ticket.firstRespondedAt
    ? SLA_STATUSES.BREACHED
    : clockStatus(now, ticket.createdAt, policy.responseTargetMinutes, ticket.firstRespondedAt ?? null);

  const resolutionStatus = clockStatus(now, ticket.createdAt, policy.resolutionTargetMinutes, ticket.resolvedAt ?? null);

  // Resolution outranks response; MET only when both clocks stopped inside target.
  const status = worse(resolutionStatus, responseStatus);

  return {
    status,
    responseTargetMinutes: policy.responseTargetMinutes,
    resolutionTargetMinutes: policy.resolutionTargetMinutes,
    responseDueAt,
    resolutionDueAt,
    respondedAt: ticket.firstRespondedAt ?? null,
    resolvedAt: ticket.resolvedAt ?? null,
    minutesToResponseDue: ticket.firstRespondedAt
      ? null
      : Math.round((responseDueAt.getTime() - now.getTime()) / 60_000),
    minutesToResolutionDue: ticket.resolvedAt
      ? null
      : Math.round((resolutionDueAt.getTime() - now.getTime()) / 60_000),
  };
}

function toPublicSlaPolicy(row: SlaPolicy): PublicSlaPolicy {
  return {
    id: row.id,
    priorityId: row.priorityId,
    priority: row.priority
      ? { id: row.priority.id, code: row.priority.code, nameEn: row.priority.nameEn, nameAr: row.priority.nameAr }
      : null,
    responseTargetMinutes: row.responseTargetMinutes,
    resolutionTargetMinutes: row.resolutionTargetMinutes,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const policies = () => AppDataSource.getRepository(SlaPolicy);

export async function listPolicies(): Promise<PublicSlaPolicy[]> {
  const rows = await policies()
    .createQueryBuilder('p')
    .leftJoinAndSelect('p.priority', 'priority', 'priority.id = p.priorityId')
    .orderBy('priority.sortOrder', 'ASC')
    .getMany();
  return rows.map(toPublicSlaPolicy);
}

export async function upsertPolicy(
  priorityId: string,
  input: SlaPolicyInput,
  actorUserId: string,
): Promise<PublicSlaPolicy> {
  const priority = await AppDataSource.getRepository(TicketPriority).findOne({ where: { id: priorityId } });
  if (!priority) throw new NotFoundError('TicketPriority');

  return AppDataSource.transaction(async manager => {
    let policy = await manager.findOne(SlaPolicy, { where: { priorityId } });
    if (!policy) {
      policy = manager.create(SlaPolicy, { priorityId });
    }
    policy.responseTargetMinutes = input.responseTargetMinutes;
    policy.resolutionTargetMinutes = input.resolutionTargetMinutes;
    if (input.isActive !== undefined) policy.isActive = input.isActive;

    const saved = await manager.save(SlaPolicy, policy);

    await recordAudit(manager, {
      actorUserId,
      action: AUDIT_ACTIONS.SLA_POLICY_UPDATED,
      entityType: AUDIT_ENTITY_TYPES.SLA_POLICY,
      entityId: saved.id,
      summary: `SLA policy for ${priority.code} updated`,
      details: { priorityCode: priority.code, responseTargetMinutes: saved.responseTargetMinutes, resolutionTargetMinutes: saved.resolutionTargetMinutes, isActive: saved.isActive },
    });

    const withPriority = await manager
      .createQueryBuilder(SlaPolicy, 'p')
      .leftJoinAndSelect('p.priority', 'priority', 'priority.id = p.priorityId')
      .where('p.id = :id', { id: saved.id })
      .getOne();

    return toPublicSlaPolicy(withPriority!);
  });
}

/** One query, at most four rows — the guard that keeps listTickets free of an N+1. */
export async function policyMapByPriorityId(): Promise<Map<string, SlaPolicy>> {
  const rows = await policies().find({ where: { isActive: true } });
  return new Map(rows.map(r => [r.priorityId, r]));
}

export async function findPolicyByPriorityId(priorityId: string): Promise<SlaPolicy | null> {
  return policies().findOne({ where: { priorityId, isActive: true } });
}
