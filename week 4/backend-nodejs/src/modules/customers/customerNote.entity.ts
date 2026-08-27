import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';
import { Customer } from './customer.entity';
import { User } from '../users/user.entity';

@Entity('CustomerNotes')
@Index(['customerId'])
@Index(['authorUserId'])
export class CustomerNote extends BaseEntity {
  @Column({ type: 'uniqueidentifier' })
  customerId!: string;

  @ManyToOne(() => Customer, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'customerId' })
  customer?: Customer;

  @Column({ type: 'uniqueidentifier' })
  authorUserId!: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'authorUserId' })
  author?: User;

  @Column({ type: 'nvarchar', length: 4000 })
  body!: string;
}
