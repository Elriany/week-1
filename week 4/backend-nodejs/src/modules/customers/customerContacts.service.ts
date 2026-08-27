import { AppDataSource } from '../../config/data-source';
import { NotFoundError } from '../../common/errors/AppError';
import { CustomerContact } from './customerContact.entity';

export interface PublicContact {
  id: string;
  customerId: string;
  fullNameEn: string;
  fullNameAr: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateContactInput {
  fullNameEn: string;
  fullNameAr: string;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary?: boolean;
}

export interface UpdateContactInput {
  fullNameEn?: string;
  fullNameAr?: string;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary?: boolean;
}

export function toPublicContact(c: CustomerContact): PublicContact {
  return {
    id: c.id,
    customerId: c.customerId,
    fullNameEn: c.fullNameEn,
    fullNameAr: c.fullNameAr,
    jobTitle: c.jobTitle ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    isPrimary: c.isPrimary,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

const contacts = () => AppDataSource.getRepository(CustomerContact);

export async function listContacts(customerId: string): Promise<PublicContact[]> {
  const rows = await contacts().find({
    where: { customerId },
    order: {
      isPrimary: 'DESC',
      fullNameEn: 'ASC',
    },
  });
  return rows.map(toPublicContact);
}

export async function createContact(customerId: string, input: CreateContactInput): Promise<PublicContact> {
  if (input.isPrimary) {
    await promoteToPrimary(customerId, null);
  }

  const saved = await contacts().save(
    contacts().create({
      customerId,
      fullNameEn: input.fullNameEn,
      fullNameAr: input.fullNameAr,
      jobTitle: input.jobTitle ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      isPrimary: input.isPrimary ?? false,
    }),
  );

  return toPublicContact(saved);
}

export async function updateContact(contactId: string, input: UpdateContactInput): Promise<PublicContact> {
  const contact = await contacts().findOne({ where: { id: contactId } });
  if (!contact) throw new NotFoundError('Customer contact');

  if (input.isPrimary) {
    await promoteToPrimary(contact.customerId, contactId);
  }

  Object.assign(contact, {
    fullNameEn: input.fullNameEn ?? contact.fullNameEn,
    fullNameAr: input.fullNameAr ?? contact.fullNameAr,
    jobTitle: input.jobTitle !== undefined ? input.jobTitle : contact.jobTitle,
    email: input.email !== undefined ? input.email : contact.email,
    phone: input.phone !== undefined ? input.phone : contact.phone,
    isPrimary: input.isPrimary !== undefined ? input.isPrimary : contact.isPrimary,
  });

  await contacts().save(contact);
  return toPublicContact(await contacts().findOneBy({ id: contactId }));
}

export async function deleteContact(contactId: string): Promise<void> {
  const contact = await contacts().findOne({ where: { id: contactId } });
  if (!contact) throw new NotFoundError('Customer contact');
  await contacts().softDelete(contactId);
}

/**
 * Promotes one contact to primary, demoting its siblings in the same transaction.
 * Doing this in two independent writes can leave a customer with two primary contacts
 * if the second write fails. The explicit `deletedAt IS NULL` is required because a raw
 * UPDATE query builder does not apply TypeORM's soft-delete filter the way find() does.
 *
 * When promotingContactId is null, it's called before creating a new primary contact.
 */
async function promoteToPrimary(customerId: string, promotingContactId: string | null): Promise<void> {
  await AppDataSource.transaction(async manager => {
    const where = promotingContactId
      ? 'customerId = :customerId AND id != :contactId AND deletedAt IS NULL'
      : 'customerId = :customerId AND deletedAt IS NULL';

    const params = promotingContactId ? { customerId, contactId: promotingContactId } : { customerId };

    await manager
      .createQueryBuilder()
      .update(CustomerContact)
      .set({ isPrimary: false })
      .where(where, params)
      .execute();

    if (promotingContactId) {
      await manager.update(CustomerContact, { id: promotingContactId }, { isPrimary: true });
    }
  });
}
