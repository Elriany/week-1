import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';

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
}
