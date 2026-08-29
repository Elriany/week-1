import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';
import { TicketPriority } from '../tickets/ticketPriority.entity';

@Entity('SlaPolicies')
@Index(['priorityId'], { unique: true })
export class SlaPolicy extends BaseEntity {
  @Column({ type: 'uniqueidentifier', unique: true })
  priorityId!: string;

  @ManyToOne(() => TicketPriority, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'priorityId' })
  priority?: TicketPriority;

  /** Wall-clock minutes from ticket creation to first response. */
  @Column({ type: 'int' })
  responseTargetMinutes!: number;

  /** Wall-clock minutes from ticket creation to RESOLVED or CLOSED. */
  @Column({ type: 'int' })
  resolutionTargetMinutes!: number;

  @Column({ type: 'bit', default: true })
  isActive!: boolean;
}
