import { AppDataSource } from '../../config/data-source';
import { ConflictError, NotFoundError } from '../../common/errors/AppError';
import { Branch } from './branch.entity';
import { User } from '../users/user.entity';
import { Ticket } from '../tickets/ticket.entity';
import { CLOSED_STATUS_CODES } from '../reports/reports.constants';
import { recordAudit } from '../../common/audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../../common/audit/audit.constants';

export interface PublicBranch {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBranchInput {
  code: string;
  nameEn: string;
  nameAr: string;
}

export interface UpdateBranchInput {
  nameEn?: string;
  nameAr?: string;
}

function toPublicBranch(b: Branch): PublicBranch {
  return {
    id: b.id,
    code: b.code,
    nameEn: b.nameEn,
    nameAr: b.nameAr,
    isActive: b.isActive,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

const branches = () => AppDataSource.getRepository(Branch);

export async function listBranches(includeInactive: boolean): Promise<PublicBranch[]> {
  const qb = branches().createQueryBuilder('b').orderBy('b.nameEn', 'ASC');
  if (!includeInactive) qb.where('b.isActive = :active', { active: true });
  return (await qb.getMany()).map(toPublicBranch);
}

export async function findById(id: string): Promise<Branch> {
  const branch = await branches().findOne({ where: { id } });
  if (!branch) throw new NotFoundError('Branch');
  return branch;
}

export async function createBranch(input: CreateBranchInput, actorUserId: string): Promise<PublicBranch> {
  const code = input.code.trim().toUpperCase();
  const clash = await branches().findOne({ where: { code } });
  if (clash) throw new ConflictError('A branch with this code already exists');

  return AppDataSource.transaction(async manager => {
    const saved = await manager.save(Branch, manager.create(Branch, {
      code,
      nameEn: input.nameEn,
      nameAr: input.nameAr,
      isActive: true,
    }));

    await recordAudit(manager, {
      actorUserId,
      action: AUDIT_ACTIONS.CONFIG_CREATED,
      entityType: AUDIT_ENTITY_TYPES.BRANCH,
      entityId: saved.id,
      summary: `Branch ${code} created`,
    });

    return toPublicBranch(saved);
  });
}

export async function updateBranch(id: string, input: UpdateBranchInput, actorUserId: string): Promise<PublicBranch> {
  const branch = await findById(id);

  return AppDataSource.transaction(async manager => {
    Object.assign(branch, input);
    const saved = await manager.save(Branch, branch);

    await recordAudit(manager, {
      actorUserId,
      action: AUDIT_ACTIONS.CONFIG_UPDATED,
      entityType: AUDIT_ENTITY_TYPES.BRANCH,
      entityId: id,
      summary: `Branch ${branch.code} updated`,
      details: input,
    });

    return toPublicBranch(saved);
  });
}

export async function setBranchActive(id: string, isActive: boolean, actorUserId: string): Promise<PublicBranch> {
  const branch = await findById(id);

  if (!isActive) {
    const activeUsers = await AppDataSource.getRepository(User).count({ where: { branchId: id, isActive: true } });
    if (activeUsers > 0) {
      throw new ConflictError(`Cannot deactivate: ${activeUsers} active user(s) still belong to this branch`);
    }

    const openTickets = await AppDataSource.getRepository(Ticket)
      .createQueryBuilder('t')
      .leftJoin('t.status', 'status')
      .where('t.branchId = :branchId', { branchId: id })
      .andWhere('status.code NOT IN (:...closed)', { closed: CLOSED_STATUS_CODES })
      .getCount();
    if (openTickets > 0) {
      throw new ConflictError(`Cannot deactivate: ${openTickets} open ticket(s) still belong to this branch`);
    }
  }

  return AppDataSource.transaction(async manager => {
    branch.isActive = isActive;
    const saved = await manager.save(Branch, branch);

    await recordAudit(manager, {
      actorUserId,
      action: isActive ? AUDIT_ACTIONS.CONFIG_UPDATED : AUDIT_ACTIONS.CONFIG_DEACTIVATED,
      entityType: AUDIT_ENTITY_TYPES.BRANCH,
      entityId: id,
      summary: `Branch ${branch.code} ${isActive ? 'activated' : 'deactivated'}`,
    });

    return toPublicBranch(saved);
  });
}
