import { AppDataSource } from '../../config/data-source';
import { ForbiddenError, ConflictError, NotFoundError } from '../../common/errors/AppError';
import { TicketCategory } from '../tickets/ticketCategory.entity';
import { TicketPriority } from '../tickets/ticketPriority.entity';
import { TicketStatus } from '../tickets/ticketStatus.entity';
import { SlaPolicy } from '../sla/slaPolicy.entity';
import { recordAudit } from '../../common/audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../../common/audit/audit.constants';
import type { AuditEntityType } from '../../common/audit/audit.constants';

export type ReferenceKind = 'categories' | 'priorities' | 'statuses';

const ENTITY_BY_KIND = {
  categories: TicketCategory,
  priorities: TicketPriority,
  statuses: TicketStatus,
} as const;

const AUDIT_ENTITY_TYPE_BY_KIND: Record<ReferenceKind, AuditEntityType> = {
  categories: AUDIT_ENTITY_TYPES.TICKET_CATEGORY,
  priorities: AUDIT_ENTITY_TYPES.TICKET_PRIORITY,
  statuses: AUDIT_ENTITY_TYPES.TICKET_STATUS,
};

function repoFor(kind: ReferenceKind) {
  return AppDataSource.getRepository(ENTITY_BY_KIND[kind] as any);
}

export async function listReference(kind: ReferenceKind, includeInactive: boolean): Promise<any[]> {
  const qb = repoFor(kind).createQueryBuilder('r').orderBy('r.sortOrder', 'ASC').addOrderBy('r.code', 'ASC');
  // Statuses have no isActive column — the flag is meaningless there and the
  // query is left unfiltered by design.
  if (kind !== 'statuses' && !includeInactive) {
    qb.andWhere('r.isActive = :active', { active: true });
  }
  return qb.getMany();
}

export interface CreateReferenceInput {
  code: string;
  nameEn: string;
  nameAr: string;
  sortOrder?: number;
}

export async function createReference(kind: ReferenceKind, input: CreateReferenceInput, actorUserId: string): Promise<any> {
  if (kind === 'statuses') {
    throw new ForbiddenError('Ticket statuses are fixed by the transition graph (TICKET_TRANSITIONS) and cannot be created');
  }

  const repo = repoFor(kind);
  const code = input.code.trim().toUpperCase();
  const clash = await repo.findOne({ where: { code } as any });
  if (clash) throw new ConflictError('A row with this code already exists');

  return AppDataSource.transaction(async manager => {
    const entity = ENTITY_BY_KIND[kind];
    const created = manager.create(entity as any, {
      code,
      nameEn: input.nameEn,
      nameAr: input.nameAr,
      sortOrder: input.sortOrder ?? 0,
      isActive: true,
    } as any);
    const saved = await manager.save(entity as any, created as any);

    await recordAudit(manager, {
      actorUserId,
      action: AUDIT_ACTIONS.CONFIG_CREATED,
      entityType: AUDIT_ENTITY_TYPE_BY_KIND[kind],
      entityId: (saved as any).id,
      summary: `${code} created`,
    });

    return saved;
  });
}

export interface UpdateReferenceInput {
  nameEn?: string;
  nameAr?: string;
  sortOrder?: number;
}

export async function updateReference(kind: ReferenceKind, id: string, input: UpdateReferenceInput, actorUserId: string): Promise<any> {
  const repo = repoFor(kind);
  const row = await repo.findOne({ where: { id } as any });
  if (!row) throw new NotFoundError('Reference row');

  return AppDataSource.transaction(async manager => {
    Object.assign(row as any, input);
    const entity = ENTITY_BY_KIND[kind];
    const saved = await manager.save(entity as any, row);

    await recordAudit(manager, {
      actorUserId,
      action: AUDIT_ACTIONS.CONFIG_UPDATED,
      entityType: AUDIT_ENTITY_TYPE_BY_KIND[kind],
      entityId: id,
      summary: `${(row as any).code} updated`,
      details: input,
    });

    return saved;
  });
}

export async function setReferenceActive(kind: ReferenceKind, id: string, isActive: boolean, actorUserId: string): Promise<any> {
  if (kind === 'statuses') {
    throw new ForbiddenError('Ticket statuses have no active flag and cannot be deactivated');
  }

  const repo = repoFor(kind);
  const row = await repo.findOne({ where: { id } as any });
  if (!row) throw new NotFoundError('Reference row');

  if (!isActive && kind === 'priorities') {
    // Deactivating a priority with an active SLA policy would silently stop
    // SLA maths applying to tickets at that priority.
    const activePolicy = await AppDataSource.getRepository(SlaPolicy).findOne({ where: { priorityId: id, isActive: true } });
    if (activePolicy) {
      throw new ConflictError('Cannot deactivate: an active SLA policy still targets this priority');
    }
  }

  return AppDataSource.transaction(async manager => {
    (row as any).isActive = isActive;
    const entity = ENTITY_BY_KIND[kind];
    const saved = await manager.save(entity as any, row);

    await recordAudit(manager, {
      actorUserId,
      action: isActive ? AUDIT_ACTIONS.CONFIG_UPDATED : AUDIT_ACTIONS.CONFIG_DEACTIVATED,
      entityType: AUDIT_ENTITY_TYPE_BY_KIND[kind],
      entityId: id,
      summary: `${(row as any).code} ${isActive ? 'activated' : 'deactivated'}`,
    });

    return saved;
  });
}
