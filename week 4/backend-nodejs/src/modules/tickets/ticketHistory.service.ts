import { EntityManager } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { TicketHistory } from './ticketHistory.entity';
import { TicketComment } from './ticketComment.entity';
import { TicketAttachment } from './ticketAttachment.entity';
import { TicketHistoryAction } from './ticket.constants';

export interface AuditHistoryEntry {
  id: string;
  ticketId: string;
  action: TicketHistoryAction;
  fromValue: string | null;
  toValue: string;
  note: string | null;
  actor: {
    id: string;
    fullNameEn: string;
    fullNameAr: string;
  } | null;
  createdAt: Date;
}

export type PublicHistoryEntry = AuditHistoryEntry | {
  kind: 'note' | 'attachment';
  id: string;
  occurredAt: Date;
  title: string;
  actor: {
    id: string;
    fullNameEn: string;
    fullNameAr: string;
  } | null;
}

export interface RecordHistoryInput {
  ticketId: string;
  actorUserId: string;
  action: TicketHistoryAction;
  fromValue?: string | null;
  toValue: string;
  note?: string | null;
}

export interface ListHistoryResult {
  items: PublicHistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
}

function toPublicHistoryEntry(h: TicketHistory): AuditHistoryEntry {
  return {
    id: h.id,
    ticketId: h.ticketId,
    action: h.action,
    fromValue: h.fromValue ?? null,
    toValue: h.toValue,
    note: h.note ?? null,
    actor: h.actorUser
      ? {
          id: h.actorUser.id,
          fullNameEn: h.actorUser.fullNameEn,
          fullNameAr: h.actorUser.fullNameAr,
        }
      : null,
    createdAt: h.createdAt,
  };
}

const history = () => AppDataSource.getRepository(TicketHistory);

/**
 * Records a history entry for a ticket lifecycle event.
 * MUST be called within a transaction via EntityManager.
 * Never opens its own transaction.
 *
 * @param manager The EntityManager from the enclosing transaction
 * @param input The history entry details
 */
export async function recordHistory(manager: EntityManager, input: RecordHistoryInput): Promise<void> {
  await manager.save(
    TicketHistory,
    manager.create(TicketHistory, {
      ticketId: input.ticketId,
      actorUserId: input.actorUserId,
      action: input.action,
      fromValue: input.fromValue ?? null,
      toValue: input.toValue,
      note: input.note ?? null,
    }),
  );
}

/**
 * Internal helper: fetch note entries for a ticket
 * Pre-loads all notes before slicing to include them in pagination.
 * NOTE: This means the total count and slicing is approximate when notes are involved.
 */
async function noteEntries(
  ticketId: string,
  includeInternal: boolean,
): Promise<Array<{ kind: 'note'; id: string; occurredAt: Date; title: string; actor: { id: string; fullNameEn: string; fullNameAr: string } | null }>> {
  const query = AppDataSource.getRepository(TicketComment)
    .createQueryBuilder('n')
    .leftJoinAndSelect('n.author', 'author', 'author.id = n.authorUserId')
    .select([
      'n.id',
      'n.ticketId',
      'n.body',
      'n.isInternal',
      'n.createdAt',
      'author.id',
      'author.fullNameEn',
      'author.fullNameAr',
    ])
    .where('n.ticketId = :ticketId', { ticketId });

  // A second `.where()` here would silently replace the ticketId condition
  // above instead of combining with it — `.andWhere()` is required.
  if (!includeInternal) {
    query.andWhere('n.isInternal = :isInternal', { isInternal: false });
  }

  const notes = await query.getMany();

  return notes.map(n => {
    const truncated = n.body.length > 100 ? n.body.slice(0, 100) + '…' : n.body;
    return {
      kind: 'note' as const,
      id: n.id,
      occurredAt: n.createdAt,
      title: truncated,
      reference: null,
      statusEn: null,
      statusAr: null,
      actor: n.author
        ? { id: n.author.id, fullNameEn: n.author.fullNameEn, fullNameAr: n.author.fullNameAr }
        : null,
    };
  });
}

/**
 * Internal helper: fetch attachment entries for a ticket
 * Pre-loads all attachments before slicing to include them in pagination.
 */
async function attachmentEntries(
  ticketId: string,
): Promise<Array<{ kind: 'attachment'; id: string; occurredAt: Date; title: string; actor: { id: string; fullNameEn: string; fullNameAr: string } | null }>> {
  const attachments = await AppDataSource.getRepository(TicketAttachment)
    .createQueryBuilder('a')
    .leftJoinAndSelect('a.uploadedBy', 'uploader', 'uploader.id = a.uploadedByUserId')
    .select([
      'a.id',
      'a.ticketId',
      'a.originalName',
      'a.createdAt',
      'uploader.id',
      'uploader.fullNameEn',
      'uploader.fullNameAr',
    ])
    .where('a.ticketId = :ticketId', { ticketId })
    .getMany();

  return attachments.map(a => ({
    kind: 'attachment' as const,
    id: a.id,
    occurredAt: a.createdAt,
    title: a.originalName,
    reference: null,
    statusEn: null,
    statusAr: null,
    actor: a.uploadedBy
      ? { id: a.uploadedBy.id, fullNameEn: a.uploadedBy.fullNameEn, fullNameAr: a.uploadedBy.fullNameAr }
      : null,
  }));
}

/**
 * Lists history entries for a ticket in reverse chronological order.
 * Merges audit records (TicketHistory), notes (TicketComment), and attachments.
 * Supports pagination.
 *
 * NOTE: Because notes and attachments are fetched without pagination limits,
 * the total count and page boundaries are computed after merge and slice.
 * In a high-volume production system, consider limiting note/attachment queries.
 */
export async function listHistory(
  ticketId: string,
  page: number = 1,
  pageSize: number = 20,
  includeInternal: boolean = true,
): Promise<ListHistoryResult> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));

  // Fetch all three sources in parallel
  const [auditRows, notes, attachments] = await Promise.all([
    history()
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.actorUser', 'actor', 'actor.id = h.actorUserId')
      .where('h.ticketId = :ticketId', { ticketId })
      .getMany(),
    noteEntries(ticketId, includeInternal),
    attachmentEntries(ticketId),
  ]);

  // Convert audit rows to history entries and merge with notes and attachments
  const merged = [
    ...auditRows.map(toPublicHistoryEntry),
    ...notes,
    ...attachments,
  ].sort((a, b) => {
    const aTime = 'createdAt' in a ? a.createdAt.getTime() : a.occurredAt.getTime();
    const bTime = 'createdAt' in b ? b.createdAt.getTime() : b.occurredAt.getTime();
    return bTime - aTime;
  });

  const start = (safePage - 1) * safePageSize;
  return {
    items: merged.slice(start, start + safePageSize),
    total: merged.length,
    page: safePage,
    pageSize: safePageSize,
  };
}
