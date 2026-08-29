import bcrypt from 'bcryptjs';
import { AppDataSource } from '../../config/data-source';
import { env } from '../../config/env';
import { ConflictError, NotFoundError, ValidationError } from '../../common/errors/AppError';
import { User } from './user.entity';
import { Role } from './role.entity';
import { ROLE_CODES } from './permissions.constants';
import { Customer } from '../customers/customer.entity';
import { recordAudit } from '../../common/audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../../common/audit/audit.constants';

/** The shape returned to clients. Never carries `passwordHash`. */
export interface PublicUser {
  id: string;
  email: string;
  fullNameEn: string;
  fullNameAr: string;
  isActive: boolean;
  branchId: string;
  departmentId: string;
  roleId: string;
  role?: { id: string; code: string; nameEn: string; nameAr: string };
  customerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullNameEn: string;
  fullNameAr: string;
  roleId: string;
  branchId: string;
  departmentId: string;
}

export interface UpdateUserInput {
  fullNameEn?: string;
  fullNameAr?: string;
  roleId?: string;
  branchId?: string;
  departmentId?: string;
}

export interface ListUsersFilter {
  branchId?: string;
  departmentId?: string;
  roleId?: string;
  isActive?: boolean;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullNameEn: user.fullNameEn,
    fullNameAr: user.fullNameAr,
    isActive: user.isActive,
    branchId: user.branchId,
    departmentId: user.departmentId,
    roleId: user.roleId,
    role: user.role
      ? { id: user.role.id, code: user.role.code, nameEn: user.role.nameEn, nameAr: user.role.nameAr }
      : undefined,
    customerId: user.customerId ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

const users = () => AppDataSource.getRepository(User);
const roles = () => AppDataSource.getRepository(Role);

/**
 * Loads a user by email including the normally-excluded `passwordHash`.
 * Used only by the login flow — every other read path must avoid the hash.
 */
export async function findByEmailWithSecret(email: string): Promise<User | null> {
  return users()
    .createQueryBuilder('user')
    .addSelect('user.passwordHash')
    .leftJoinAndSelect('user.role', 'role')
    .where('LOWER(user.email) = LOWER(:email)', { email })
    .getOne();
}

/** Loads a user with role and the role's permissions, for request authorization. */
export async function findByIdWithPermissions(
  id: string,
): Promise<{ user: User; permissions: string[] } | null> {
  const user = await users().findOne({ where: { id }, relations: { role: true } });
  if (!user) return null;

  const role = await roles().findOne({ where: { id: user.roleId }, relations: { permissions: true } });
  const permissions = (role?.permissions ?? []).map(p => p.code);
  return { user, permissions };
}

export async function findById(id: string): Promise<User> {
  const user = await users().findOne({ where: { id }, relations: { role: true } });
  if (!user) throw new NotFoundError('User');
  return user;
}

export async function listUsers(filter: ListUsersFilter = {}): Promise<PublicUser[]> {
  const qb = users().createQueryBuilder('user').leftJoinAndSelect('user.role', 'role');

  if (filter.branchId) qb.andWhere('user.branchId = :branchId', { branchId: filter.branchId });
  if (filter.departmentId) qb.andWhere('user.departmentId = :departmentId', { departmentId: filter.departmentId });
  if (filter.roleId) qb.andWhere('user.roleId = :roleId', { roleId: filter.roleId });
  if (filter.isActive !== undefined) qb.andWhere('user.isActive = :isActive', { isActive: filter.isActive });

  qb.orderBy('user.fullNameEn', 'ASC');
  const rows = await qb.getMany();
  return rows.map(toPublicUser);
}

export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  const existing = await users()
    .createQueryBuilder('user')
    .where('LOWER(user.email) = LOWER(:email)', { email: input.email })
    .getOne();
  if (existing) throw new ConflictError('A user with this email already exists');

  const role = await roles().findOne({ where: { id: input.roleId } });
  if (!role) throw new NotFoundError('Role');

  const passwordHash = await hashPassword(input.password);

  const saved = await users().save(
    users().create({
      email: input.email,
      passwordHash,
      fullNameEn: input.fullNameEn,
      fullNameAr: input.fullNameAr,
      roleId: input.roleId,
      branchId: input.branchId,
      departmentId: input.departmentId,
      isActive: true,
    }),
  );

  return toPublicUser(await findById(saved.id));
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<PublicUser> {
  const user = await findById(id);

  if (input.roleId) {
    const role = await roles().findOne({ where: { id: input.roleId } });
    if (!role) throw new NotFoundError('Role');
  }

  Object.assign(user, input);
  await users().save(user);
  return toPublicUser(await findById(id));
}

export async function setUserActive(id: string, isActive: boolean): Promise<PublicUser> {
  const user = await findById(id);
  user.isActive = isActive;
  await users().save(user);
  return toPublicUser(await findById(id));
}

export async function listRoles(): Promise<Role[]> {
  return roles().find({ relations: { permissions: true }, order: { nameEn: 'ASC' } });
}

/**
 * Links or clears a user's Customers row — the operation the whole customer
 * portal depends on. Unlinking (customerId: null) is always allowed; it is
 * the recovery path for a mistake and must never be blocked.
 */
export async function linkCustomer(userId: string, customerId: string | null, actorUserId: string): Promise<PublicUser> {
  const user = await findById(userId);

  if (customerId === null) {
    user.customerId = null;
    await users().save(user);
    return toPublicUser(await findById(userId));
  }

  if (user.role?.code !== ROLE_CODES.CUSTOMER) {
    throw new ValidationError({ userId: 'Only a CUSTOMER-role user can be linked to a customer' });
  }

  const customer = await AppDataSource.getRepository(Customer).findOne({ where: { id: customerId } });
  if (!customer || !customer.isActive) {
    throw new ValidationError({ customerId: 'Customer does not exist or is not active' });
  }

  // Checked explicitly rather than letting UX_Users_customerId surface as a
  // driver-level 500 — the index is the backstop, this is the error message.
  const alreadyLinked = await users().findOne({ where: { customerId } });
  if (alreadyLinked && alreadyLinked.id !== userId) {
    throw new ConflictError('This customer is already linked to another account');
  }

  await AppDataSource.transaction(async manager => {
    user.customerId = customerId;
    await manager.save(User, user);

    await recordAudit(manager, {
      actorUserId,
      action: AUDIT_ACTIONS.CONFIG_UPDATED,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: userId,
      summary: `Linked to customer ${customer.code}`,
    });
  });

  // findById opens its own connection — it must run after the transaction
  // commits, or it deadlocks against the still-uncommitted update (see
  // Story 15's note on the same pattern in tickets.service.ts).
  return toPublicUser(await findById(userId));
}
