import { AppDataSource } from '../../config/data-source';
import { Customer } from './customer.entity';
import { CustomerNote } from './customerNote.entity';
import { CustomerAttachment } from './customerAttachment.entity';
import { Ticket } from '../tickets/ticket.entity';
import { TicketStatus } from '../tickets/ticketStatus.entity';

export type HistoryKind = 'ticket' | 'note' | 'attachment';

export interface HistoryEntry {
  kind: HistoryKind;
  id: string;
  occurredAt: Date;
  title: string;
  reference: string | null;
  statusEn: string | null;
  statusAr: string | null;
  actor: { id: string; fullNameEn: string; fullNameAr: string } | null;
}

export interface PagedHistory {
  items: HistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
}

async function ticketEntries(customerId: string): Promise<HistoryEntry[]> {
  const tickets = await AppDataSource.getRepository(Ticket)
    .createQueryBuilder('t')
    .leftJoinAndSelect('t.status', 'status', 'status.id = t.statusId')
    .where('t.customerId = :customerId', { customerId })
    .getMany();

  return tickets.map(t => ({
    kind: 'ticket' as const,
    id: t.id,
    occurredAt: t.createdAt,
    title: t.subject,
    reference: t.ticketNumber,
    statusEn: t.status?.nameEn ?? null,
    statusAr: t.status?.nameAr ?? null,
    actor: null,
  }));
}

async function noteEntries(customerId: string): Promise<HistoryEntry[]> {
  const notes = await AppDataSource.getRepository(CustomerNote)
    .createQueryBuilder('n')
    .leftJoinAndSelect('n.author', 'author', 'author.id = n.authorUserId')
    .select([
      'n.id',
      'n.customerId',
      'n.body',
      'n.createdAt',
      'author.id',
      'author.fullNameEn',
      'author.fullNameAr',
    ])
    .where('n.customerId = :customerId', { customerId })
    .getMany();

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

async function attachmentEntries(customerId: string): Promise<HistoryEntry[]> {
  const attachments = await AppDataSource.getRepository(CustomerAttachment)
    .createQueryBuilder('a')
    .leftJoinAndSelect('a.uploadedBy', 'uploader', 'uploader.id = a.uploadedByUserId')
    .select([
      'a.id',
      'a.customerId',
      'a.originalName',
      'a.createdAt',
      'uploader.id',
      'uploader.fullNameEn',
      'uploader.fullNameAr',
    ])
    .where('a.customerId = :customerId', { customerId })
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

export async function getHistory(customerId: string, page = 1, pageSize = 20): Promise<PagedHistory> {
  const [tickets, notes, files] = await Promise.all([
    ticketEntries(customerId),
    noteEntries(customerId),
    attachmentEntries(customerId),
  ]);

  const merged = [...tickets, ...notes, ...files].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  const start = (Math.max(1, page) - 1) * pageSize;
  return {
    items: merged.slice(start, start + pageSize),
    total: merged.length,
    page,
    pageSize,
  };
}
