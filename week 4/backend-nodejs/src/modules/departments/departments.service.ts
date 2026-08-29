import { AppDataSource } from '../../config/data-source';
import { ConflictError, NotFoundError } from '../../common/errors/AppError';
import { Department } from './department.entity';
import { User } from '../users/user.entity';
import { Ticket } from '../tickets/ticket.entity';
import { CLOSED_STATUS_CODES } from '../reports/reports.constants';
import { recordAudit } from '../../common/audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../../common/audit/audit.constants';

export interface PublicDepartment {
  id: string;
  branchId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDepartmentInput {
  branchId: string;
  code: string;
  nameEn: string;
  nameAr: string;
}

export interface UpdateDepartmentInput {
  nameEn?: string;
  nameAr?: string;
}

export interface ListDepartmentsFilter {
  branchId?: string;
  includeInactive?: boolean;
}

function toPublicDepartment(d: Department): PublicDepartment {
  return {
    id: d.id,
    branchId: d.branchId,
    code: d.code,
    nameEn: d.nameEn,
    nameAr: d.nameAr,
    isActive: d.isActive,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

const departments = () => AppDataSource.getRepository(Department);

export async function listDepartments(filter: ListDepartmentsFilter = {}): Promise<PublicDepartment[]> {
  const qb = departments().createQueryBuilder('d').orderBy('d.nameEn', 'ASC');
  if (filter.branchId) qb.andWhere('d.branchId = :branchId', { branchId: filter.branchId });
  if (!filter.includeInactive) qb.andWhere('d.isActive = :active', { active: true });
  return (await qb.getMany()).map(toPublicDepartment);
}

export async function findById(id: string): Promise<Department> {
  const department = await departments().findOne({ where: { id } });
  if (!department) throw new NotFoundError('Department');
  return department;
}

export async function createDepartment(input: CreateDepartmentInput, actorUserId: string): Promise<PublicDepartment> {
  const code = input.code.trim().toUpperCase();
  const clash = await departments().findOne({ where: { branchId: input.branchId, code } });
  if (clash) throw new ConflictError('A department with this code already exists in this branch');

  return AppDataSource.transaction(async manager => {
    const saved = await manager.save(Department, manager.create(Department, {
      branchId: input.branchId,
      code,
      nameEn: input.nameEn,
      nameAr: input.nameAr,
      isActive: true,
    }));

    await recordAudit(manager, {
      actorUserId,
      action: AUDIT_ACTIONS.CONFIG_CREATED,
      entityType: AUDIT_ENTITY_TYPES.DEPARTMENT,
      entityId: saved.id,
      summary: `Department ${code} created`,
    });

    return toPublicDepartment(saved);
  });
}

export async function updateDepartment(id: string, input: UpdateDepartmentInput, actorUserId: string): Promise<PublicDepartment> {
  const department = await findById(id);

  return AppDataSource.transaction(async manager => {
    Object.assign(department, input);
    const saved = await manager.save(Department, department);

    await recordAudit(manager, {
      actorUserId,
      action: AUDIT_ACTIONS.CONFIG_UPDATED,
      entityType: AUDIT_ENTITY_TYPES.DEPARTMENT,
      entityId: id,
      summary: `Department ${department.code} updated`,
      details: input,
    });

    return toPublicDepartment(saved);
  });
}

export async function setDepartmentActive(id: string, isActive: boolean, actorUserId: string): Promise<PublicDepartment> {
  const department = await findById(id);

  if (!isActive) {
    const activeUsers = await AppDataSource.getRepository(User).count({ where: { departmentId: id, isActive: true } });
    if (activeUsers > 0) {
      throw new ConflictError(`Cannot deactivate: ${activeUsers} active user(s) still belong to this department`);
    }

    const openTickets = await AppDataSource.getRepository(Ticket)
      .createQueryBuilder('t')
      .leftJoin('t.status', 'status')
      .where('t.departmentId = :departmentId', { departmentId: id })
      .andWhere('status.code NOT IN (:...closed)', { closed: CLOSED_STATUS_CODES })
      .getCount();
    if (openTickets > 0) {
      throw new ConflictError(`Cannot deactivate: ${openTickets} open ticket(s) still belong to this department`);
    }
  }

  return AppDataSource.transaction(async manager => {
    department.isActive = isActive;
    const saved = await manager.save(Department, department);

    await recordAudit(manager, {
      actorUserId,
      action: isActive ? AUDIT_ACTIONS.CONFIG_UPDATED : AUDIT_ACTIONS.CONFIG_DEACTIVATED,
      entityType: AUDIT_ENTITY_TYPES.DEPARTMENT,
      entityId: id,
      summary: `Department ${department.code} ${isActive ? 'activated' : 'deactivated'}`,
    });

    return toPublicDepartment(saved);
  });
}
