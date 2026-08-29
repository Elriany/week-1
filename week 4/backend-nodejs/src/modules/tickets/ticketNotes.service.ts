import { AppDataSource } from '../../config/data-source';
import { NotFoundError } from '../../common/errors/AppError';
import { TicketComment } from './ticketComment.entity';
import { Ticket } from './ticket.entity';

export interface PublicTicketNoteAuthor {
  id: string;
  fullNameEn: string;
  fullNameAr: string;
}

export interface PublicTicketNote {
  id: string;
  ticketId: string;
  body: string;
  isInternal: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: PublicTicketNoteAuthor | null;
}

export interface CreateTicketNoteInput {
  body: string;
  isInternal?: boolean;
}

export interface UpdateTicketNoteInput {
  body?: string;
  isInternal?: boolean;
}

export function toPublicTicketNote(
  note: TicketComment & { author?: { id: string; fullNameEn: string; fullNameAr: string } | null },
): PublicTicketNote {
  return {
    id: note.id,
    ticketId: note.ticketId,
    body: note.body,
    isInternal: note.isInternal,
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

const notes = () => AppDataSource.getRepository(TicketComment);

export async function listNotes(ticketId: string, includeInternal: boolean): Promise<PublicTicketNote[]> {
  let query = notes()
    .createQueryBuilder('n')
    .leftJoinAndSelect('n.author', 'author', 'author.id = n.authorUserId')
    .select([
      'n.id',
      'n.ticketId',
      'n.body',
      'n.isInternal',
      'n.createdAt',
      'n.updatedAt',
      'author.id',
      'author.fullNameEn',
      'author.fullNameAr',
    ])
    .where('n.ticketId = :ticketId', { ticketId });

  if (!includeInternal) {
    query = query.andWhere('n.isInternal = :isInternal', { isInternal: false });
  }

  const rows = await query.orderBy('n.createdAt', 'DESC').addOrderBy('n.id', 'DESC').getMany();

  return rows.map(row => toPublicTicketNote(row as any));
}

export async function createNote(
  ticketId: string,
  authorUserId: string,
  body: string,
  isInternal: boolean = true,
): Promise<PublicTicketNote> {
  const savedId = await AppDataSource.transaction(async manager => {
    const saved = await manager.save(
      TicketComment,
      manager.create(TicketComment, { ticketId, authorUserId, body, isInternal }),
    );

    // A customer-visible note is the other signal (besides assignment) that
    // stops the response clock. An internal note does not — the customer has
    // heard nothing. Write-once, in the same transaction as the note insert.
    if (!isInternal) {
      const ticket = await manager.findOne(Ticket, { where: { id: ticketId } });
      if (ticket && !ticket.firstRespondedAt) {
        ticket.firstRespondedAt = new Date();
        await manager.save(Ticket, ticket);
      }
    }

    return saved.id;
  });

  const note = await notes()
    .createQueryBuilder('n')
    .leftJoinAndSelect('n.author', 'author', 'author.id = n.authorUserId')
    .select([
      'n.id',
      'n.ticketId',
      'n.body',
      'n.isInternal',
      'n.createdAt',
      'n.updatedAt',
      'author.id',
      'author.fullNameEn',
      'author.fullNameAr',
    ])
    .where('n.id = :id', { id: savedId })
    .getOne();

  return toPublicTicketNote(note as any);
}

export async function updateNote(
  noteId: string,
  body?: string,
  isInternal?: boolean,
): Promise<PublicTicketNote> {
  const note = await notes().findOne({ where: { id: noteId } });
  if (!note) throw new NotFoundError('Ticket note');

  if (body !== undefined) {
    note.body = body;
  }
  if (isInternal !== undefined) {
    note.isInternal = isInternal;
  }

  await notes().save(note);

  const updated = await notes()
    .createQueryBuilder('n')
    .leftJoinAndSelect('n.author', 'author', 'author.id = n.authorUserId')
    .select([
      'n.id',
      'n.ticketId',
      'n.body',
      'n.isInternal',
      'n.createdAt',
      'n.updatedAt',
      'author.id',
      'author.fullNameEn',
      'author.fullNameAr',
    ])
    .where('n.id = :id', { id: noteId })
    .getOne();

  return toPublicTicketNote(updated as any);
}

export async function deleteNote(noteId: string): Promise<void> {
  const note = await notes().findOne({ where: { id: noteId } });
  if (!note) throw new NotFoundError('Ticket note');
  await notes().softDelete(noteId);
}

export async function findNoteById(noteId: string): Promise<TicketComment> {
  const note = await notes().findOne({ where: { id: noteId } });
  if (!note) throw new NotFoundError('Ticket note');
  return note;
}
