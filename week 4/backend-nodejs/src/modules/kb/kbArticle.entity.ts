import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/BaseEntity';
import { KbCategory } from './kbCategory.entity';
import { User } from '../users/user.entity';

@Entity('KbArticles')
@Index(['slug'], { unique: true })
@Index(['categoryId'])
@Index(['isPublished'])
export class KbArticle extends BaseEntity {
  @Column({ type: 'nvarchar', length: 200, unique: true })
  slug!: string;

  /** Nullable: an uncategorised FAQ is legal and shows in unfiltered results. */
  @Column({ type: 'uniqueidentifier', nullable: true })
  categoryId?: string | null;

  @ManyToOne(() => KbCategory, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'categoryId' })
  category?: KbCategory | null;

  @Column({ type: 'nvarchar', length: 300 })
  titleEn!: string;

  @Column({ type: 'nvarchar', length: 300 })
  titleAr!: string;

  /** Plain text. Rich content, images, and versioning are out of scope. */
  @Column({ type: 'nvarchar', length: 'MAX' })
  bodyEn!: string;

  @Column({ type: 'nvarchar', length: 'MAX' })
  bodyAr!: string;

  @Column({ type: 'bit', default: false })
  isPublished!: boolean;

  /** Kept after an unpublish, as the record of when the article was last live. */
  @Column({ type: 'datetime2', nullable: true })
  publishedAt?: Date | null;

  @Column({ type: 'uniqueidentifier', nullable: true })
  publishedByUserId?: string | null;

  @ManyToOne(() => User, { eager: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'publishedByUserId' })
  publishedBy?: User | null;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;
}
