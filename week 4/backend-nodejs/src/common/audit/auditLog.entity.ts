import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../entities/BaseEntity';
import { User } from '../../modules/users/user.entity';
import type { AuditAction, AuditEntityType } from './audit.constants';

/**
 * Cross-module action record. Deliberately has no retention policy in this
 * scope; the [createdAt] index keeps date-ranged reads cheap as it grows.
 */
@Entity('AuditLogs')
@Index(['actorUserId'])
@Index(['entityType', 'entityId'])
@Index(['createdAt'])
export class AuditLog extends BaseEntity {
  @Column({ type: 'uniqueidentifier' })
  actorUserId!: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'actorUserId' })
  actorUser?: User;

  @Column({ type: 'nvarchar', length: 60 })
  action!: AuditAction;

  @Column({ type: 'nvarchar', length: 60 })
  entityType!: AuditEntityType;

  /** Nullable: a configuration action may not name a single row. */
  @Column({ type: 'uniqueidentifier', nullable: true })
  entityId?: string | null;

  /** Human-readable one-liner, already resolved to names rather than ids. */
  @Column({ type: 'nvarchar', length: 500 })
  summary!: string;

  /** JSON string, capped at AUDIT_DETAILS_MAX by the service. Never a whole entity. */
  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  details?: string | null;
}
