import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';

/**
 * Deliberately has no `isActive` column. A deactivated status would still be
 * reachable through the hard-coded transition graph, producing a state the UI
 * cannot offer but the API accepts. Statuses are governed by the graph
 * (ticket.constants.ts), not by a flag — see Story 27's administration story.
 */
@Entity('TicketStatuses')
@Index(['code'], { unique: true })
export class TicketStatus extends BaseEntity {
  @Column({ type: 'nvarchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'nvarchar', length: 200 })
  nameEn!: string;

  @Column({ type: 'nvarchar', length: 200 })
  nameAr!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;
}
