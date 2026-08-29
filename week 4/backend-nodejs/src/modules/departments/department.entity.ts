import { Entity, Column, ManyToOne, JoinColumn, Index, ForeignKey } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';
import { Branch } from '../branches/branch.entity';

/**
 * `code` is deliberately NOT globally unique — the same department code (e.g.
 * SUPPORT) is legal in every branch. Only the (branchId, code) pair must be
 * unique. See Story 27's administration story for the migration that removed
 * the earlier global unique constraint.
 */
@Entity('Departments')
@Index(['branchId'])
@Index(['code'])
@Index(['branchId', 'code'], { unique: true })
export class Department extends BaseEntity {
  @Column({ type: 'uniqueidentifier' })
  branchId!: string;

  @ManyToOne(() => Branch, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch;

  @Column({ type: 'nvarchar', length: 50 })
  code!: string;

  @Column({ type: 'nvarchar', length: 200 })
  nameEn!: string;

  @Column({ type: 'nvarchar', length: 200 })
  nameAr!: string;

  @Column({ type: 'bit', default: true })
  isActive!: boolean;
}
