import { MigrationInterface, QueryRunner } from 'typeorm';

export class KnowledgeBase1765000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE [KbCategories] (
        [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [code] nvarchar(50) NOT NULL UNIQUE,
        [nameEn] nvarchar(200) NOT NULL,
        [nameAr] nvarchar(200) NOT NULL,
        [sortOrder] int NOT NULL CONSTRAINT [DF_KbCategories_sortOrder] DEFAULT 0,
        [isActive] bit NOT NULL CONSTRAINT [DF_KbCategories_isActive] DEFAULT 1,
        [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [deletedAt] datetime2 NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX [IDX_KbCategories_code] ON [KbCategories]([code])`);

    await queryRunner.query(`
      CREATE TABLE [KbArticles] (
        [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [slug] nvarchar(200) NOT NULL,
        [categoryId] uniqueidentifier NULL,
        [titleEn] nvarchar(300) NOT NULL,
        [titleAr] nvarchar(300) NOT NULL,
        [bodyEn] nvarchar(max) NOT NULL,
        [bodyAr] nvarchar(max) NOT NULL,
        [isPublished] bit NOT NULL CONSTRAINT [DF_KbArticles_isPublished] DEFAULT 0,
        [publishedAt] datetime2 NULL,
        [publishedByUserId] uniqueidentifier NULL,
        [sortOrder] int NOT NULL CONSTRAINT [DF_KbArticles_sortOrder] DEFAULT 0,
        [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [deletedAt] datetime2 NULL,
        CONSTRAINT [FK_KbArticles_categoryId] FOREIGN KEY ([categoryId])
          REFERENCES [KbCategories]([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_KbArticles_publishedByUserId] FOREIGN KEY ([publishedByUserId])
          REFERENCES [Users]([id]) ON DELETE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX [UX_KbArticles_slug] ON [KbArticles]([slug])`);
    await queryRunner.query(`CREATE INDEX [IDX_KbArticles_categoryId] ON [KbArticles]([categoryId])`);
    await queryRunner.query(`CREATE INDEX [IDX_KbArticles_isPublished] ON [KbArticles]([isPublished])`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE [KbArticles]`);
    await queryRunner.query(`DROP TABLE [KbCategories]`);
  }
}
