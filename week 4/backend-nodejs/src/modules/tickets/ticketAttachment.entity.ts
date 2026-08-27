import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';
import { Ticket } from './ticket.entity';
import { User } from '../users/user.entity';

@Entity('TicketAttachments')
@Index(['ticketId'])
export class TicketAttachment extends BaseEntity {
  @Column({ type: 'uniqueidentifier' })
  ticketId!: string;

  @ManyToOne(() => Ticket, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'ticketId' })
  ticket?: Ticket;

  @Column({ type: 'uniqueidentifier' })
  uploadedByUserId!: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'uploadedByUserId' })
  uploadedBy?: User;

  @Column({ type: 'nvarchar', length: 255 })
  originalName!: string;

  @Column({ type: 'nvarchar', length: 255 })
  storedName!: string;

  @Column({ type: 'nvarchar', length: 150 })
  mimeType!: string;

  @Column({ type: 'bigint' })
  sizeBytes!: string;
}
