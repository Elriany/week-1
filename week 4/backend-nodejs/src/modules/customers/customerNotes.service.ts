import { AppDataSource } from '../../config/data-source';
import { NotFoundError } from '../../common/errors/AppError';
import { CustomerNote } from './customerNote.entity';

export interface PublicNoteAuthor {
  id: string;
  fullNameEn: string;
  fullNameAr: string;
}

export interface PublicNote {
  id: string;
  customerId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  author: PublicNoteAuthor | null;
}

export interface CreateNoteInput {
  body: string;
}

export interface UpdateNoteInput {
  body: string;
}

export function toPublicNote(note: CustomerNote & { author?: { id: string; fullNameEn: string; fullNameAr: string } | null }): PublicNote {
  return {
    id: note.id,
    customerId: note.customerId,
    body: note.body,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    author: note.author
      ? {
          id: note.author.id,
          fullNameEn: note.author.fullNameEn,
          fullNameAr: note.author.fullNameAr,
        }
      : null,
  };
}

const notes = () => AppDataSource.getRepository(CustomerNote);

export async function listNotes(customerId: string): Promise<PublicNote[]> {
  const rows = await notes()
    .createQueryBuilder('n')
    .leftJoinAndSelect('n.author', 'author', 'author.id = n.authorUserId')
    .select([
      'n.id',
      'n.customerId',
      'n.body',
      'n.createdAt',
      'n.updatedAt',
      'author.id',
      'author.fullNameEn',
      'author.fullNameAr',
    ])
    .where('n.customerId = :customerId', { customerId })
    .orderBy('n.createdAt', 'DESC')
    .getMany();

  return rows.map(row => toPublicNote(row as any));
}

export async function createNote(customerId: string, authorUserId: string, body: string): Promise<PublicNote> {
  const saved = await notes().save(
    notes().create({
      customerId,
      authorUserId,
      body,
    }),
  );

  const note = await notes()
    .createQueryBuilder('n')
    .leftJoinAndSelect('n.author', 'author', 'author.id = n.authorUserId')
    .select([
      'n.id',
      'n.customerId',
      'n.body',
      'n.createdAt',
      'n.updatedAt',
      'author.id',
      'author.fullNameEn',
      'author.fullNameAr',
    ])
    .where('n.id = :id', { id: saved.id })
    .getOne();

  return toPublicNote(note as any);
}

export async function updateNote(noteId: string, body: string): Promise<PublicNote> {
  const note = await notes().findOne({ where: { id: noteId } });
  if (!note) throw new NotFoundError('Customer note');

  note.body = body;
  await notes().save(note);

  const updated = await notes()
    .createQueryBuilder('n')
    .leftJoinAndSelect('n.author', 'author', 'author.id = n.authorUserId')
    .select([
      'n.id',
      'n.customerId',
      'n.body',
      'n.createdAt',
      'n.updatedAt',
      'author.id',
      'author.fullNameEn',
      'author.fullNameAr',
    ])
    .where('n.id = :id', { id: noteId })
    .getOne();

  return toPublicNote(updated as any);
}

export async function deleteNote(noteId: string): Promise<void> {
  const note = await notes().findOne({ where: { id: noteId } });
  if (!note) throw new NotFoundError('Customer note');
  await notes().softDelete(noteId);
}

export async function findNoteById(noteId: string): Promise<CustomerNote> {
  const note = await notes().findOne({ where: { id: noteId } });
  if (!note) throw new NotFoundError('Customer note');
  return note;
}
