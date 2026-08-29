import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';
import { Branch } from '../branches/branch.entity';
import { Department } from '../departments/department.entity';
import { Customer } from '../customers/customer.entity';
import { User } from '../users/user.entity';
import { TicketStatus } from './ticketStatus.entity';
import { TicketPriority } from './ticketPriority.entity';
import { TicketCategory } from './ticketCategory.entity';
import type { TicketChannel } from './ticket.constants';

@Entity('Tickets')
@Index(['ticketNumber'], { unique: true })
@Index(['branchId'])
@Index(['departmentId'])
@Index(['customerId'])
@Index(['assignedUserId'])
@Index(['statusId'])
@Index(['priorityId'])
@Index(['categoryId'])
@Index(['channel'])
@Index(['branchId', 'departmentId'])
export class Ticket extends BaseEntity {
  @Column({ type: 'nvarchar', length: 50, unique: true })
  ticketNumber!: string;

  @Column({ type: 'uniqueidentifier' })
  branchId!: string;

  @ManyToOne(() => Branch, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch;

  @Column({ type: 'uniqueidentifier' })
  departmentId!: string;

  @ManyToOne(() => Department, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'departmentId' })
  department?: Department;

  @Column({ type: 'uniqueidentifier' })
  customerId!: string;

  @ManyToOne(() => Customer, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'customerId' })
  customer?: Customer;

  @Column({ type: 'uniqueidentifier', nullable: true })
  assignedUserId?: string | null;

  @ManyToOne(() => User, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'assignedUserId' })
  assignedUser?: User | null;

  @Column({ type: 'uniqueidentifier' })
  statusId!: string;

  @ManyToOne(() => TicketStatus, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'statusId' })
  status?: TicketStatus;

  @Column({ type: 'uniqueidentifier' })
  priorityId!: string;

  @ManyToOne(() => TicketPriority, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'priorityId' })
  priority?: TicketPriority;

  @Column({ type: 'nvarchar', length: 300 })
  subject!: string;

  @Column({ type: 'nvarchar', length: 4000 })
  description!: string;

  @Column({ type: 'uniqueidentifier', nullable: true })
  categoryId?: string | null;

  @ManyToOne(() => TicketCategory, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'categoryId' })
  category?: TicketCategory | null;

  /**
   * How the ticket arrived. Not null with a DB default so every existing row and
   * every caller that predates this column keeps working. See TICKET_CHANNELS.
   */
  @Column({ type: 'nvarchar', length: 30, default: 'WEB' })
  channel!: TicketChannel;

  /**
   * Set once, by the first assignment or first customer-visible note. Never
   * overwritten — a reassignment does not restart the response clock.
   */
  @Column({ type: 'datetime2', nullable: true })
  firstRespondedAt?: Date | null;

  /** Set once, by the first transition into RESOLVED or CLOSED. */
  @Column({ type: 'datetime2', nullable: true })
  resolvedAt?: Date | null;
}
