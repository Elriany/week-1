import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';
import { Customer } from './customer.entity';

@Entity('CustomerContacts')
@Index(['customerId'])
export class CustomerContact extends BaseEntity {
  @Column({ type: 'uniqueidentifier' })
  customerId!: string;

  @ManyToOne(() => Customer, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'customerId' })
  customer?: Customer;

  @Column({ type: 'nvarchar', length: 200 })
  fullNameEn!: string;

  @Column({ type: 'nvarchar', length: 200 })
  fullNameAr!: string;

  @Column({ type: 'nvarchar', length: 150, nullable: true })
  jobTitle?: string | null;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  phone?: string | null;

  @Column({ type: 'bit', default: false })
  isPrimary!: boolean;
}
