import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';
import { Ticket } from './ticket.entity';
import { User } from '../users/user.entity';
import { TicketHistoryAction } from './ticket.constants';

@Entity('TicketHistory')
@Index(['ticketId'])
@Index(['actorUserId'])
@Index(['ticketId', 'createdAt'])
export class TicketHistory extends BaseEntity {
  @Column({ type: 'uniqueidentifier' })
  ticketId!: string;

  @ManyToOne(() => Ticket, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'ticketId' })
  ticket?: Ticket;

  @Column({ type: 'uniqueidentifier' })
  actorUserId!: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'actorUserId' })
  actorUser?: User;

  @Column({ type: 'nvarchar', length: 50 })
  action!: TicketHistoryAction;

  /**
   * Denormalized previous value as a string (status code, user name, priority code, etc.)
   * Nullable because creation has no "from" value.
   */
  @Column({ type: 'nvarchar', length: 500, nullable: true })
  fromValue?: string | null;

  /**
   * Denormalized new value as a string (status code, user name, priority code, etc.)
   */
  @Column({ type: 'nvarchar', length: 500 })
  toValue!: string;

  /**
   * Optional note provided by the actor (e.g., reason for transition).
   */
  @Column({ type: 'nvarchar', length: 500, nullable: true })
  note?: string | null;
}
