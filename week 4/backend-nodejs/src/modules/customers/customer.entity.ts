import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';
import { Branch } from '../branches/branch.entity';

@Entity('Customers')
@Index(['branchId'])
@Index(['code'], { unique: true })
export class Customer extends BaseEntity {
  @Column({ type: 'uniqueidentifier' })
  branchId!: string;

  @ManyToOne(() => Branch, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch;

  @Column({ type: 'nvarchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'nvarchar', length: 200 })
  fullNameEn!: string;

  @Column({ type: 'nvarchar', length: 200 })
  fullNameAr!: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  phone?: string | null;

  @Column({ type: 'nvarchar', length: 2, default: 'en' })
  preferredLanguage!: string;

  @Column({ type: 'bit', default: true })
  isActive!: boolean;
}
