import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';
import { Ticket } from './ticket.entity';
import { User } from '../users/user.entity';

@Entity('TicketComments')
@Index(['ticketId'])
@Index(['authorUserId'])
export class TicketComment extends BaseEntity {
  @Column({ type: 'uniqueidentifier' })
  ticketId!: string;

  @ManyToOne(() => Ticket, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'ticketId' })
  ticket?: Ticket;

  @Column({ type: 'uniqueidentifier' })
  authorUserId!: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'authorUserId' })
  author?: User;

  @Column({ type: 'nvarchar', length: 4000 })
  body!: string;

  @Column({ type: 'bit', default: false })
  isInternal!: boolean;
}
