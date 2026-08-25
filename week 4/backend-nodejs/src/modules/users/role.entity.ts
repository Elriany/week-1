import { Entity, Column, Index, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';
import { Permission } from './permission.entity';

@Entity('Roles')
@Index(['code'], { unique: true })
export class Role extends BaseEntity {
  @Column({ type: 'nvarchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'nvarchar', length: 200 })
  nameEn!: string;

  @Column({ type: 'nvarchar', length: 200 })
  nameAr!: string;

  @ManyToMany(() => Permission, { eager: false })
  @JoinTable({
    name: 'RolePermissions',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissions?: Permission[];
}
