import { MigrationInterface, QueryRunner } from 'typeorm';

export class TicketManagement1760000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE [TicketCategories] (
        [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [code] nvarchar(50) NOT NULL UNIQUE,
        [nameEn] nvarchar(200) NOT NULL,
        [nameAr] nvarchar(200) NOT NULL,
        [sortOrder] int NOT NULL CONSTRAINT [DF_TicketCategories_sortOrder] DEFAULT 0,
        [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [deletedAt] datetime2 NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX [IDX_TicketCategories_code] ON [TicketCategories]([code])`);

    await queryRunner.query(`ALTER TABLE [Tickets] ADD [categoryId] uniqueidentifier NULL`);
    await queryRunner.query(`
      ALTER TABLE [Tickets] ADD CONSTRAINT [FK_Tickets_categoryId]
      FOREIGN KEY ([categoryId]) REFERENCES [TicketCategories]([id]) ON DELETE NO ACTION
    `);
    await queryRunner.query(`CREATE INDEX [IDX_Tickets_categoryId] ON [Tickets]([categoryId])`);

    // The list screen filters by status inside a branch; this index serves that query.
    await queryRunner.query(
      `CREATE INDEX [IDX_Tickets_branchId_statusId] ON [Tickets]([branchId], [statusId])`,
    );

    // --- Retire the legacy status codes -------------------------------------
    // Story 02 seeded OPEN and PENDING, which predate the lifecycle in this
    // work item. Remap any ticket that uses them, then remove the rows. Today
    // no tickets exist, so the UPDATEs are a no-op safety net for environments
    // that were seeded and exercised manually.
    await queryRunner.query(`
      INSERT INTO [TicketStatuses] ([code], [nameEn], [nameAr], [sortOrder])
      SELECT v.code, v.nameEn, v.nameAr, v.sortOrder
      FROM (VALUES
        ('ASSIGNED', N'Assigned', N'مُسند', 1),
        ('IN_PROGRESS', N'In Progress', N'قيد التنفيذ', 2),
        ('PENDING_CUSTOMER', N'Pending Customer', N'بانتظار العميل', 3)
      ) AS v(code, nameEn, nameAr, sortOrder)
      WHERE NOT EXISTS (SELECT 1 FROM [TicketStatuses] s WHERE s.[code] = v.code)
    `);

    await queryRunner.query(`
      UPDATE [Tickets] SET [statusId] = (SELECT [id] FROM [TicketStatuses] WHERE [code] = 'IN_PROGRESS')
      WHERE [statusId] IN (SELECT [id] FROM [TicketStatuses] WHERE [code] = 'OPEN')
    `);
    await queryRunner.query(`
      UPDATE [Tickets] SET [statusId] = (SELECT [id] FROM [TicketStatuses] WHERE [code] = 'PENDING_CUSTOMER')
      WHERE [statusId] IN (SELECT [id] FROM [TicketStatuses] WHERE [code] = 'PENDING')
    `);
    await queryRunner.query(`DELETE FROM [TicketStatuses] WHERE [code] IN ('OPEN', 'PENDING')`);

    // Re-sort the survivors so the UI can order by sortOrder alone.
    await queryRunner.query(`UPDATE [TicketStatuses] SET [sortOrder] = 0 WHERE [code] = 'NEW'`);
    await queryRunner.query(`UPDATE [TicketStatuses] SET [sortOrder] = 4 WHERE [code] = 'RESOLVED'`);
    await queryRunner.query(`UPDATE [TicketStatuses] SET [sortOrder] = 5 WHERE [code] = 'CLOSED'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO [TicketStatuses] ([code], [nameEn], [nameAr], [sortOrder])
      SELECT v.code, v.nameEn, v.nameAr, v.sortOrder
      FROM (VALUES ('OPEN', N'Open', N'مفتوح', 1), ('PENDING', N'Pending', N'قيد الانتظار', 2))
        AS v(code, nameEn, nameAr, sortOrder)
      WHERE NOT EXISTS (SELECT 1 FROM [TicketStatuses] s WHERE s.[code] = v.code)
    `);
    await queryRunner.query(`
      UPDATE [Tickets] SET [statusId] = (SELECT [id] FROM [TicketStatuses] WHERE [code] = 'OPEN')
      WHERE [statusId] IN (SELECT [id] FROM [TicketStatuses] WHERE [code] IN ('ASSIGNED', 'IN_PROGRESS'))
    `);
    await queryRunner.query(`
      UPDATE [Tickets] SET [statusId] = (SELECT [id] FROM [TicketStatuses] WHERE [code] = 'PENDING')
      WHERE [statusId] IN (SELECT [id] FROM [TicketStatuses] WHERE [code] = 'PENDING_CUSTOMER')
    `);
    await queryRunner.query(
      `DELETE FROM [TicketStatuses] WHERE [code] IN ('ASSIGNED', 'IN_PROGRESS', 'PENDING_CUSTOMER')`,
    );

    await queryRunner.query(`DROP INDEX [IDX_Tickets_branchId_statusId] ON [Tickets]`);
    await queryRunner.query(`DROP INDEX [IDX_Tickets_categoryId] ON [Tickets]`);
    await queryRunner.query(`ALTER TABLE [Tickets] DROP CONSTRAINT [FK_Tickets_categoryId]`);
    await queryRunner.query(`ALTER TABLE [Tickets] DROP COLUMN [categoryId]`);
    await queryRunner.query(`DROP INDEX [IDX_TicketCategories_code] ON [TicketCategories]`);
    await queryRunner.query(`DROP TABLE [TicketCategories]`);
  }
}
