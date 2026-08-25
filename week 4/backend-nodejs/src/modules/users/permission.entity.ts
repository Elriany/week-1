import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';

@Entity('Permissions')
@Index(['code'], { unique: true })
export class Permission extends BaseEntity {
  /** Dot-namespaced action code, e.g. `users.read`, `tickets.update`. */
  @Column({ type: 'nvarchar', length: 100, unique: true })
  code!: string;

  @Column({ type: 'nvarchar', length: 200 })
  nameEn!: string;

  @Column({ type: 'nvarchar', length: 200 })
  nameAr!: string;
}
