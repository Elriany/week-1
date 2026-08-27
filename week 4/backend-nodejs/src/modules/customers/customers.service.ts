import { AppDataSource } from '../../config/data-source';
import { ConflictError, NotFoundError } from '../../common/errors/AppError';
import { Customer } from './customer.entity';

export interface PublicCustomer {
  id: string;
  code: string;
  fullNameEn: string;
  fullNameAr: string;
  email: string | null;
  phone: string | null;
  preferredLanguage: string;
  isActive: boolean;
  branchId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerInput {
  code?: string;
  fullNameEn: string;
  fullNameAr: string;
  email?: string | null;
  phone?: string | null;
  preferredLanguage?: string;
  branchId: string;
}

export interface UpdateCustomerInput {
  fullNameEn?: string;
  fullNameAr?: string;
  email?: string | null;
  phone?: string | null;
  preferredLanguage?: string;
}

export interface ListCustomersFilter {
  q?: string;
  branchId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PagedCustomers {
  items: PublicCustomer[];
  total: number;
  page: number;
  pageSize: number;
}

export function toPublicCustomer(c: Customer): PublicCustomer {
  return {
    id: c.id,
    code: c.code,
    fullNameEn: c.fullNameEn,
    fullNameAr: c.fullNameAr,
    email: c.email ?? null,
    phone: c.phone ?? null,
    preferredLanguage: c.preferredLanguage,
    isActive: c.isActive,
    branchId: c.branchId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

const customers = () => AppDataSource.getRepository(Customer);

const CODE_PREFIX = 'CUST';

async function generateCode(): Promise<string> {
  const row = await customers()
    .createQueryBuilder('c')
    .withDeleted()
    .where('c.code LIKE :prefix', { prefix: `${CODE_PREFIX}%` })
    .orderBy('LEN(c.code)', 'DESC')
    .addOrderBy('c.code', 'DESC')
    .getOne();

  const lastNumber = row ? Number.parseInt(row.code.slice(CODE_PREFIX.length), 10) : 0;
  const next = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;
  return `${CODE_PREFIX}${String(next).padStart(4, '0')}`;
}

export async function listCustomers(filter: ListCustomersFilter = {}): Promise<PagedCustomers> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));

  const qb = customers().createQueryBuilder('c');

  if (filter.branchId) qb.andWhere('c.branchId = :branchId', { branchId: filter.branchId });
  if (filter.isActive !== undefined) qb.andWhere('c.isActive = :isActive', { isActive: filter.isActive });

  if (filter.q) {
    const term = `%${filter.q.replace(/[[\]%_]/g, ch => `[${ch}]`)}%`;
    qb.andWhere(
      `(c.fullNameEn LIKE :term OR c.fullNameAr LIKE :term
        OR c.code LIKE :term OR c.email LIKE :term OR c.phone LIKE :term)`,
      { term },
    );
  }

  qb.orderBy('c.fullNameEn', 'ASC')
    .skip((page - 1) * pageSize)
    .take(pageSize);

  const [rows, total] = await qb.getManyAndCount();
  return { items: rows.map(toPublicCustomer), total, page, pageSize };
}

export async function findById(id: string): Promise<Customer> {
  const customer = await customers().findOne({ where: { id } });
  if (!customer) throw new NotFoundError('Customer');
  return customer;
}

export async function createCustomer(input: CreateCustomerInput): Promise<PublicCustomer> {
  const code = input.code?.trim() || (await generateCode());

  const clash = await customers()
    .createQueryBuilder('c')
    .withDeleted()
    .where('c.code = :code', { code })
    .getOne();
  if (clash) throw new ConflictError('A customer with this code already exists');

  const saved = await customers().save(
    customers().create({
      code,
      fullNameEn: input.fullNameEn,
      fullNameAr: input.fullNameAr,
      email: input.email ?? null,
      phone: input.phone ?? null,
      preferredLanguage: input.preferredLanguage ?? 'en',
      branchId: input.branchId,
      isActive: true,
    }),
  );

  return toPublicCustomer(await findById(saved.id));
}

export async function updateCustomer(id: string, input: UpdateCustomerInput): Promise<PublicCustomer> {
  const customer = await findById(id);
  Object.assign(customer, input);
  await customers().save(customer);
  return toPublicCustomer(await findById(id));
}

export async function setCustomerActive(id: string, isActive: boolean): Promise<PublicCustomer> {
  const customer = await findById(id);
  customer.isActive = isActive;
  await customers().save(customer);
  return toPublicCustomer(await findById(id));
}

export async function softDeleteCustomer(id: string): Promise<void> {
  await findById(id);
  await customers().softDelete(id);
}
