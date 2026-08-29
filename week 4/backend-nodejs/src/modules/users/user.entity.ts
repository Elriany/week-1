import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';
import { Branch } from '../branches/branch.entity';
import { Department } from '../departments/department.entity';
import { Role } from './role.entity';
import { Customer } from '../customers/customer.entity';

@Entity('Users')
@Index(['branchId'])
@Index(['departmentId'])
@Index(['roleId'])
@Index(['email'], { unique: true })
@Index(['customerId'])
@Index(['branchId', 'departmentId'])
export class User extends BaseEntity {
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
  roleId!: string;

  @ManyToOne(() => Role, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'roleId' })
  role?: Role;

  @Column({ type: 'nvarchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'nvarchar', length: 200 })
  fullNameEn!: string;

  @Column({ type: 'nvarchar', length: 200 })
  fullNameAr!: string;

  /**
   * bcrypt hash. `select: false` keeps it out of every query that does not
   * explicitly ask for it, so it can never leak through a controller response.
   * Nullable: a user without a hash can never authenticate (fail closed).
   */
  @Column({ type: 'nvarchar', length: 255, nullable: true, select: false })
  passwordHash?: string | null;

  @Column({ type: 'bit', default: true })
  isActive!: boolean;

  /**
   * Links a CUSTOMER-role login to the Customers row whose tickets it owns.
   * NULL for every staff account. A CUSTOMER-role account with a NULL value can
   * reach nothing in the portal — that is deliberate; see Story 18.
   */
  @Column({ type: 'uniqueidentifier', nullable: true })
  customerId?: string | null;

  @ManyToOne(() => Customer, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'customerId' })
  customer?: Customer | null;
}
