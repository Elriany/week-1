import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';
import { Department } from '../departments/department.entity';

@Entity('Branches')
@Index(['code'], { unique: true })
export class Branch extends BaseEntity {
  @Column({ type: 'nvarchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'nvarchar', length: 200 })
  nameEn!: string;

  @Column({ type: 'nvarchar', length: 200 })
  nameAr!: string;

  @Column({ type: 'bit', default: true })
  isActive!: boolean;

  /** Inverse side of Department.branch. Not eager — loaded only when a caller
   *  asks for it, so this adds no column and no join to existing queries. */
  @OneToMany(() => Department, department => department.branch)
  departments?: Department[];
}
