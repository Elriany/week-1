import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';

@Entity('Roles')
@Index(['code'], { unique: true })
export class Role extends BaseEntity {
  @Column({ type: 'nvarchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'nvarchar', length: 200 })
  nameEn!: string;

  @Column({ type: 'nvarchar', length: 200 })
  nameAr!: string;
}
