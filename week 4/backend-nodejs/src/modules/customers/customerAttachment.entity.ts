import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';
import { Customer } from './customer.entity';
import { User } from '../users/user.entity';

@Entity('CustomerAttachments')
@Index(['customerId'])
export class CustomerAttachment extends BaseEntity {
  @Column({ type: 'uniqueidentifier' })
  customerId!: string;

  @ManyToOne(() => Customer, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'customerId' })
  customer?: Customer;

  @Column({ type: 'uniqueidentifier' })
  uploadedByUserId!: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'uploadedByUserId' })
  uploadedBy?: User;

  @Column({ type: 'nvarchar', length: 255 })
  originalName!: string;

  @Column({ type: 'nvarchar', length: 255 })
  storedName!: string;

  @Column({ type: 'nvarchar', length: 150 })
  mimeType!: string;

  @Column({ type: 'bigint' })
  sizeBytes!: string;
}
