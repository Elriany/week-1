import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';
import { Branch } from '../branches/branch.entity';
import { Department } from '../departments/department.entity';
import { Role } from './role.entity';

@Entity('Users')
@Index(['branchId'])
@Index(['departmentId'])
@Index(['roleId'])
@Index(['email'], { unique: true })
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

  @Column({ type: 'bit', default: true })
  isActive!: boolean;
}
