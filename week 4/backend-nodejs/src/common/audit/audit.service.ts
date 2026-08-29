import { EntityManager } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { logger } from '../utils/logger';
import { AuditLog } from './auditLog.entity';
import { AUDIT_DETAILS_MAX, type AuditAction, type AuditEntityType } from './audit.constants';

export interface RecordAuditInput {
  actorUserId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  summary: string;
  details?: unknown;
}

export interface PublicAuditEntry {
  id: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  summary: string;
  details: unknown;
  actor: { id: string; fullNameEn: string; fullNameAr: string } | null;
  createdAt: Date;
}

export interface ListAuditFilter {
  entityType?: AuditEntityType;
  entityId?: string;
  actorUserId?: string;
  action?: AuditAction;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export interface PagedAudit {
  items: PublicAuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

const auditLogs = () => AppDataSource.getRepository(AuditLog);

function serializeDetails(details: unknown): string | null {
  if (details === undefined) return null;
  const json = JSON.stringify(details);
  return json.length > AUDIT_DETAILS_MAX ? json.slice(0, AUDIT_DETAILS_MAX) : json;
}

/**
 * Writes an audit row through the caller-supplied manager. Never opens its own
 * transaction — it shares the fate of whatever transaction the caller is in.
 */
export async function recordAudit(manager: EntityManager, input: RecordAuditInput): Promise<void> {
  await manager.save(
    AuditLog,
    manager.create(AuditLog, {
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary,
      details: serializeDetails(input.details),
    }),
  );
}

/**
 * For call sites with no enclosing transaction. This is the only place an
 * audit write failure is swallowed — a broken log must never break the CRM.
 */
export async function recordAuditSafe(input: RecordAuditInput): Promise<void> {
  try {
    await AppDataSource.transaction(manager => recordAudit(manager, input));
  } catch (err) {
    logger.error('Audit write failed', {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export function toPublicAuditEntry(row: AuditLog): PublicAuditEntry {
  let details: unknown = null;
  if (row.details) {
    try {
      details = JSON.parse(row.details);
    } catch {
      details = null;
    }
  }

  return {
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId ?? null,
    summary: row.summary,
    details,
    actor: row.actorUser
      ? { id: row.actorUser.id, fullNameEn: row.actorUser.fullNameEn, fullNameAr: row.actorUser.fullNameAr }
      : null,
    createdAt: row.createdAt,
  };
}

export async function listAudit(filter: ListAuditFilter = {}): Promise<PagedAudit> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));

  const qb = auditLogs()
    .createQueryBuilder('a')
    .leftJoinAndSelect('a.actorUser', 'actorUser', 'actorUser.id = a.actorUserId')
    .select([
      'a.id',
      'a.actorUserId',
      'a.action',
      'a.entityType',
      'a.entityId',
      'a.summary',
      'a.details',
      'a.createdAt',
      'a.updatedAt',
      'a.deletedAt',
      'actorUser.id',
      'actorUser.fullNameEn',
      'actorUser.fullNameAr',
    ]);

  if (filter.entityType) qb.andWhere('a.entityType = :entityType', { entityType: filter.entityType });
  if (filter.entityId) qb.andWhere('a.entityId = :entityId', { entityId: filter.entityId });
  if (filter.actorUserId) qb.andWhere('a.actorUserId = :actorUserId', { actorUserId: filter.actorUserId });
  if (filter.action) qb.andWhere('a.action = :action', { action: filter.action });
  if (filter.from) qb.andWhere('a.createdAt >= :from', { from: filter.from });
  if (filter.to) qb.andWhere('a.createdAt <= :to', { to: filter.to });

  qb.orderBy('a.createdAt', 'DESC').addOrderBy('a.id', 'DESC');
  qb.skip((page - 1) * pageSize).take(pageSize);

  const [rows, total] = await qb.getManyAndCount();
  return { items: rows.map(toPublicAuditEntry), total, page, pageSize };
}
