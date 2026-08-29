import { AppDataSource } from '../../config/data-source';
import type { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { Ticket } from '../tickets/ticket.entity';
import { TicketStatus } from '../tickets/ticketStatus.entity';
import { TicketPriority } from '../tickets/ticketPriority.entity';
import { TicketCategory } from '../tickets/ticketCategory.entity';
import { User } from '../users/user.entity';
import { TICKET_CHANNELS, TICKET_STATUS_CODES } from '../tickets/ticket.constants';
import { computeSla, policyMapByPriorityId } from '../sla/sla.service';
import { SLA_STATUSES } from '../sla/sla.constants';
import { CLOSED_STATUS_CODES, WORKLOAD_TOP_N } from './reports.constants';

export interface CountBucket {
  key: string;
  labelEn: string;
  labelAr: string;
  count: number;
  /** Query parameters that reproduce this bucket on GET /tickets. */
  filter: Record<string, string>;
}

export interface ReportScope {
  branchId?: string; // undefined only for an Administrator viewing all
  from?: Date;
  to?: Date;
}

const tickets = () => AppDataSource.getRepository(Ticket);

/** Applies branch scoping and a createdAt date range to a query builder aliased `t`. */
function applyScope<T extends ObjectLiteral>(qb: SelectQueryBuilder<T>, scope: ReportScope, alias = 't'): SelectQueryBuilder<T> {
  if (scope.branchId) qb.andWhere(`${alias}.branchId = :branchId`, { branchId: scope.branchId });
  if (scope.from) qb.andWhere(`${alias}.createdAt >= :from`, { from: scope.from });
  if (scope.to) qb.andWhere(`${alias}.createdAt <= :to`, { to: scope.to });
  return qb;
}

function joinCondition(scope: ReportScope, alias: string): [string, Record<string, unknown>] {
  const clauses = [`${alias}.deletedAt IS NULL`];
  const params: Record<string, unknown> = {};
  if (scope.branchId) {
    clauses.push(`${alias}.branchId = :branchId`);
    params.branchId = scope.branchId;
  }
  if (scope.from) {
    clauses.push(`${alias}.createdAt >= :from`);
    params.from = scope.from;
  }
  if (scope.to) {
    clauses.push(`${alias}.createdAt <= :to`);
    params.to = scope.to;
  }
  return [clauses.join(' AND '), params];
}

/** Left-joins from the status table, not from tickets, so a status with zero
 * tickets in scope still returns count: 0. */
export async function countByStatus(scope: ReportScope): Promise<CountBucket[]> {
  const [cond, params] = joinCondition(scope, 't');
  const rows = await AppDataSource.getRepository(TicketStatus)
    .createQueryBuilder('s')
    .leftJoin(Ticket, 't', `t.statusId = s.id AND ${cond}`, params)
    .select('s.id', 'id')
    .addSelect('s.code', 'code')
    .addSelect('s.nameEn', 'nameEn')
    .addSelect('s.nameAr', 'nameAr')
    .addSelect('COUNT(t.id)', 'count')
    .groupBy('s.id').addGroupBy('s.code').addGroupBy('s.nameEn').addGroupBy('s.nameAr').addGroupBy('s.sortOrder')
    .orderBy('s.sortOrder', 'ASC')
    .getRawMany();

  return rows.map(r => ({
    key: r.code,
    labelEn: r.nameEn,
    labelAr: r.nameAr,
    count: Number(r.count),
    filter: { statusId: r.id },
  }));
}

export async function countByPriority(scope: ReportScope): Promise<CountBucket[]> {
  const [cond, params] = joinCondition(scope, 't');
  const rows = await AppDataSource.getRepository(TicketPriority)
    .createQueryBuilder('p')
    .leftJoin(Ticket, 't', `t.priorityId = p.id AND ${cond}`, params)
    .select('p.id', 'id')
    .addSelect('p.code', 'code')
    .addSelect('p.nameEn', 'nameEn')
    .addSelect('p.nameAr', 'nameAr')
    .addSelect('COUNT(t.id)', 'count')
    .groupBy('p.id').addGroupBy('p.code').addGroupBy('p.nameEn').addGroupBy('p.nameAr').addGroupBy('p.sortOrder')
    .orderBy('p.sortOrder', 'ASC')
    .getRawMany();

  return rows.map(r => ({
    key: r.code,
    labelEn: r.nameEn,
    labelAr: r.nameAr,
    count: Number(r.count),
    filter: { priorityId: r.id },
  }));
}

export async function countByCategory(scope: ReportScope): Promise<CountBucket[]> {
  const [cond, params] = joinCondition(scope, 't');
  const rows = await AppDataSource.getRepository(TicketCategory)
    .createQueryBuilder('c')
    .leftJoin(Ticket, 't', `t.categoryId = c.id AND ${cond}`, params)
    .select('c.id', 'id')
    .addSelect('c.code', 'code')
    .addSelect('c.nameEn', 'nameEn')
    .addSelect('c.nameAr', 'nameAr')
    .addSelect('COUNT(t.id)', 'count')
    .groupBy('c.id').addGroupBy('c.code').addGroupBy('c.nameEn').addGroupBy('c.nameAr').addGroupBy('c.sortOrder')
    .orderBy('c.sortOrder', 'ASC')
    .getRawMany();

  const buckets: CountBucket[] = rows.map(r => ({
    key: r.code,
    labelEn: r.nameEn,
    labelAr: r.nameAr,
    count: Number(r.count),
    filter: { categoryId: r.id },
  }));

  // GET /tickets has no "category is null" predicate, so this bucket carries
  // an empty filter rather than one that would silently mean "all".
  const uncategorisedQb = tickets().createQueryBuilder('t').where('t.categoryId IS NULL');
  applyScope(uncategorisedQb, scope);
  const uncategorisedCount = await uncategorisedQb.getCount();

  buckets.push({
    key: 'UNCATEGORIZED',
    labelEn: 'Uncategorised',
    labelAr: 'بدون تصنيف',
    count: uncategorisedCount,
    filter: {},
  });

  return buckets;
}

export async function countByChannel(scope: ReportScope): Promise<CountBucket[]> {
  const qb = tickets().createQueryBuilder('t')
    .select('t.channel', 'channel')
    .addSelect('COUNT(t.id)', 'count')
    .groupBy('t.channel');
  applyScope(qb, scope);
  const rows = await qb.getRawMany();
  const byChannel = new Map(rows.map(r => [r.channel, Number(r.count)]));

  return Object.values(TICKET_CHANNELS).map(channel => ({
    key: channel,
    labelEn: channel,
    labelAr: channel,
    count: byChannel.get(channel) ?? 0,
    filter: { channel },
  }));
}

export interface AgentWorkloadRow {
  userId: string;
  fullNameEn: string;
  fullNameAr: string;
  openCount: number;
  resolvedCount: number;
  breachedCount: number;
  filter: Record<string, string>;
}

/**
 * breachedCount cannot be a plain GROUP BY — it depends on computeSla, the
 * single definition of "breached". This loads the (branch- and date-scoped)
 * assigned tickets once, with only the columns computeSla needs, and
 * aggregates in memory — the same bounded exception slaBuckets documents,
 * extended here because reusing computeSla matters more than a pure SQL count.
 */
export async function agentWorkload(scope: ReportScope): Promise<AgentWorkloadRow[]> {
  const qb = tickets().createQueryBuilder('t')
    .leftJoinAndSelect('t.status', 'status')
    .leftJoinAndSelect('t.assignedUser', 'assignedUser')
    .where('t.assignedUserId IS NOT NULL');
  applyScope(qb, scope);
  const rows = await qb.getMany();

  const policyMap = await policyMapByPriorityId();

  const byAgent = new Map<string, AgentWorkloadRow>();
  for (const row of rows) {
    const userId = row.assignedUserId as string;
    // A ticket assigned to a soft-deleted user still counts — grouped under
    // UNKNOWN rather than dropped, so workload totals stay consistent with
    // the status counts.
    const known = row.assignedUser != null;
    const key = known ? userId : 'UNKNOWN';
    let entry = byAgent.get(key);
    if (!entry) {
      entry = {
        userId: key,
        fullNameEn: known ? row.assignedUser!.fullNameEn : 'Deleted user',
        fullNameAr: known ? row.assignedUser!.fullNameAr : 'مستخدم محذوف',
        openCount: 0,
        resolvedCount: 0,
        breachedCount: 0,
        filter: known ? { assignedUserId: userId } : {},
      };
      byAgent.set(key, entry);
    }

    if (!CLOSED_STATUS_CODES.includes(row.status!.code as any)) entry.openCount += 1;
    if (row.status!.code === TICKET_STATUS_CODES.RESOLVED) entry.resolvedCount += 1;

    const policy = policyMap.get(row.priorityId) ?? null;
    const snapshot = computeSla(row, policy);
    if (snapshot?.status === SLA_STATUSES.BREACHED) entry.breachedCount += 1;
  }

  return Array.from(byAgent.values())
    .sort((a, b) => b.openCount - a.openCount)
    .slice(0, WORKLOAD_TOP_N);
}

export interface ResolutionStats {
  resolvedCount: number;
  avgResolutionMinutes: number | null;
  medianResolutionMinutes: number | null;
}

/**
 * Resolution figures filter on resolvedAt, not createdAt — a ticket resolved
 * inside the range but created outside it still counts here.
 */
export async function resolutionStats(scope: ReportScope): Promise<ResolutionStats> {
  const qb = tickets().createQueryBuilder('t')
    .where('t.resolvedAt IS NOT NULL')
    .andWhere('t.resolvedAt >= t.createdAt');
  if (scope.branchId) qb.andWhere('t.branchId = :branchId', { branchId: scope.branchId });
  if (scope.from) qb.andWhere('t.resolvedAt >= :from', { from: scope.from });
  if (scope.to) qb.andWhere('t.resolvedAt <= :to', { to: scope.to });

  qb.select('COUNT(t.id)', 'resolvedCount')
    .addSelect('AVG(CAST(DATEDIFF(MINUTE, t.createdAt, t.resolvedAt) AS float))', 'avgResolutionMinutes');

  let medianResolutionMinutes: number | null = null;
  try {
    const medianQb = tickets().createQueryBuilder('t')
      .where('t.resolvedAt IS NOT NULL')
      .andWhere('t.resolvedAt >= t.createdAt');
    if (scope.branchId) medianQb.andWhere('t.branchId = :branchId', { branchId: scope.branchId });
    if (scope.from) medianQb.andWhere('t.resolvedAt >= :from', { from: scope.from });
    if (scope.to) medianQb.andWhere('t.resolvedAt <= :to', { to: scope.to });
    medianQb.select(
      'DISTINCT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY DATEDIFF(MINUTE, t.createdAt, t.resolvedAt)) OVER ()',
      'median',
    );
    const medianRows = await medianQb.getRawMany();
    if (medianRows.length > 0 && medianRows[0].median != null) {
      medianResolutionMinutes = Number(medianRows[0].median);
    }
  } catch {
    // If PERCENTILE_CONT proves unsupported on this driver, drop the median
    // rather than substitute an average and label it a median.
    medianResolutionMinutes = null;
  }

  const result = await qb.getRawOne();
  const resolvedCount = Number(result?.resolvedCount ?? 0);
  const avgResolutionMinutes = resolvedCount > 0 && result?.avgResolutionMinutes != null
    ? Number(result.avgResolutionMinutes)
    : null;

  return { resolvedCount, avgResolutionMinutes, medianResolutionMinutes };
}

export interface SlaBucketRow extends CountBucket {}

/**
 * The documented exception: SLA status is computed, not stored, so bucketing
 * requires loading rows and calling computeSla per row. Loads only the OPEN
 * tickets in scope — bounded by open-ticket volume, not total history. A
 * denormalised, on-write-maintained SLA status column would remove this
 * bound; out of scope here.
 */
export async function slaBuckets(scope: ReportScope): Promise<{ buckets: SlaBucketRow[]; noPolicyCount: number }> {
  const qb = tickets().createQueryBuilder('t')
    .select(['t.id', 't.createdAt', 't.priorityId', 't.firstRespondedAt', 't.resolvedAt', 't.statusId'])
    .leftJoin('t.status', 'status')
    .addSelect('status.code', 'status_code')
    .where('status.code NOT IN (:...closed)', { closed: CLOSED_STATUS_CODES });
  applyScope(qb, scope);
  const rows = await qb.getMany();

  const policyMap = await policyMapByPriorityId();

  const counts: Record<string, number> = {
    [SLA_STATUSES.ON_TRACK]: 0,
    [SLA_STATUSES.AT_RISK]: 0,
    [SLA_STATUSES.BREACHED]: 0,
    [SLA_STATUSES.MET]: 0,
  };
  let noPolicyCount = 0;

  for (const row of rows) {
    const policy = policyMap.get(row.priorityId) ?? null;
    const snapshot = computeSla(row, policy);
    if (!snapshot) {
      noPolicyCount += 1;
      continue;
    }
    counts[snapshot.status] += 1;
  }

  const labelFor: Record<string, { en: string; ar: string }> = {
    ON_TRACK: { en: 'On Track', ar: 'ضمن الوقت' },
    AT_RISK: { en: 'At Risk', ar: 'في خطر' },
    BREACHED: { en: 'Breached', ar: 'مخالف' },
    MET: { en: 'Met', ar: 'محقق' },
  };

  const buckets = Object.values(SLA_STATUSES).map(status => ({
    key: status,
    labelEn: labelFor[status].en,
    labelAr: labelFor[status].ar,
    count: counts[status],
    filter: { slaStatus: status },
  }));

  return { buckets, noPolicyCount };
}

export async function unassignedCount(scope: ReportScope): Promise<number> {
  const qb = tickets().createQueryBuilder('t').where('t.assignedUserId IS NULL');
  applyScope(qb, scope);
  return qb.getCount();
}

export async function myOpenCount(scope: ReportScope, userId: string): Promise<number> {
  const qb = tickets().createQueryBuilder('t')
    .leftJoin('t.status', 'status')
    .where('t.assignedUserId = :userId', { userId })
    .andWhere('status.code NOT IN (:...closed)', { closed: CLOSED_STATUS_CODES });
  applyScope(qb, scope);
  return qb.getCount();
}

export async function myBreachedCount(scope: ReportScope, userId: string): Promise<number> {
  const qb = tickets().createQueryBuilder('t')
    .select(['t.id', 't.createdAt', 't.priorityId', 't.firstRespondedAt', 't.resolvedAt'])
    .leftJoin('t.status', 'status')
    .where('t.assignedUserId = :userId', { userId })
    .andWhere('status.code NOT IN (:...closed)', { closed: CLOSED_STATUS_CODES });
  applyScope(qb, scope);
  const rows = await qb.getMany();
  const policyMap = await policyMapByPriorityId();
  return rows.filter(row => computeSla(row, policyMap.get(row.priorityId) ?? null)?.status === SLA_STATUSES.BREACHED).length;
}

export async function branchOpenCount(scope: ReportScope): Promise<number> {
  const qb = tickets().createQueryBuilder('t')
    .leftJoin('t.status', 'status')
    .where('status.code NOT IN (:...closed)', { closed: CLOSED_STATUS_CODES });
  applyScope(qb, scope);
  return qb.getCount();
}

export async function myByStatus(scope: ReportScope, userId: string): Promise<CountBucket[]> {
  const [cond, params] = joinCondition(scope, 't');
  const rows = await AppDataSource.getRepository(TicketStatus)
    .createQueryBuilder('s')
    .leftJoin(Ticket, 't', `t.statusId = s.id AND t.assignedUserId = :userId AND ${cond}`, { ...params, userId })
    .select('s.id', 'id')
    .addSelect('s.code', 'code')
    .addSelect('s.nameEn', 'nameEn')
    .addSelect('s.nameAr', 'nameAr')
    .addSelect('COUNT(t.id)', 'count')
    .groupBy('s.id').addGroupBy('s.code').addGroupBy('s.nameEn').addGroupBy('s.nameAr').addGroupBy('s.sortOrder')
    .orderBy('s.sortOrder', 'ASC')
    .getRawMany();

  return rows.map(r => ({
    key: r.code,
    labelEn: r.nameEn,
    labelAr: r.nameAr,
    count: Number(r.count),
    filter: { assignedUserId: userId, statusId: r.id },
  }));
}

export async function myByPriority(scope: ReportScope, userId: string): Promise<CountBucket[]> {
  const [cond, params] = joinCondition(scope, 't');
  const rows = await AppDataSource.getRepository(TicketPriority)
    .createQueryBuilder('p')
    .leftJoin(Ticket, 't', `t.priorityId = p.id AND t.assignedUserId = :userId AND ${cond}`, { ...params, userId })
    .select('p.id', 'id')
    .addSelect('p.code', 'code')
    .addSelect('p.nameEn', 'nameEn')
    .addSelect('p.nameAr', 'nameAr')
    .addSelect('COUNT(t.id)', 'count')
    .groupBy('p.id').addGroupBy('p.code').addGroupBy('p.nameEn').addGroupBy('p.nameAr').addGroupBy('p.sortOrder')
    .orderBy('p.sortOrder', 'ASC')
    .getRawMany();

  return rows.map(r => ({
    key: r.code,
    labelEn: r.nameEn,
    labelAr: r.nameAr,
    count: Number(r.count),
    filter: { assignedUserId: userId, priorityId: r.id },
  }));
}

export async function totals(scope: ReportScope): Promise<{ total: number; open: number; closed: number; unassigned: number }> {
  const totalQb = tickets().createQueryBuilder('t');
  applyScope(totalQb, scope);
  const total = await totalQb.getCount();

  const openQb = tickets().createQueryBuilder('t').leftJoin('t.status', 'status')
    .where('status.code NOT IN (:...closed)', { closed: CLOSED_STATUS_CODES });
  applyScope(openQb, scope);
  const open = await openQb.getCount();

  const unassigned = await unassignedCount(scope);

  return { total, open, closed: total - open, unassigned };
}
