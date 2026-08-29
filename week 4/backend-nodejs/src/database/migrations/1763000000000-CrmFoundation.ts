import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Story 27 foundation: a channel on every ticket, a nullable link from a login
 * account to its Customers row, and a cross-module AuditLogs table.
 */
export class CrmFoundation1763000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE [Tickets] ADD [channel] nvarchar(30) NOT NULL
        CONSTRAINT [DF_Tickets_channel] DEFAULT 'WEB'
    `);
    await queryRunner.query(`CREATE INDEX [IDX_Tickets_channel] ON [Tickets]([channel])`);

    await queryRunner.query(`ALTER TABLE [Users] ADD [customerId] uniqueidentifier NULL`);
    await queryRunner.query(`
      ALTER TABLE [Users] ADD CONSTRAINT [FK_Users_customerId]
        FOREIGN KEY ([customerId]) REFERENCES [Customers]([id]) ON DELETE NO ACTION
    `);
    // Filtered so the many NULLs on staff rows stay legal — a plain unique
    // index would fail the moment a second staff user is created.
    await queryRunner.query(`
      CREATE UNIQUE INDEX [UX_Users_customerId] ON [Users]([customerId])
        WHERE [customerId] IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE [AuditLogs] (
        [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [actorUserId] uniqueidentifier NOT NULL,
        [action] nvarchar(60) NOT NULL,
        [entityType] nvarchar(60) NOT NULL,
        [entityId] uniqueidentifier NULL,
        [summary] nvarchar(500) NOT NULL,
        [details] nvarchar(2000) NULL,
        [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [deletedAt] datetime2 NULL,
        CONSTRAINT [FK_AuditLogs_User] FOREIGN KEY ([actorUserId])
          REFERENCES [Users]([id]) ON DELETE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX [IDX_AuditLogs_actorUserId] ON [AuditLogs]([actorUserId])`);
    await queryRunner.query(`CREATE INDEX [IDX_AuditLogs_entityType_entityId] ON [AuditLogs]([entityType], [entityId])`);
    await queryRunner.query(`CREATE INDEX [IDX_AuditLogs_createdAt] ON [AuditLogs]([createdAt])`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE [AuditLogs]`);

    await queryRunner.query(`DROP INDEX [UX_Users_customerId] ON [Users]`);
    await queryRunner.query(`ALTER TABLE [Users] DROP CONSTRAINT [FK_Users_customerId]`);
    await queryRunner.query(`ALTER TABLE [Users] DROP COLUMN [customerId]`);

    await queryRunner.query(`DROP INDEX [IDX_Tickets_channel] ON [Tickets]`);
    await queryRunner.query(`ALTER TABLE [Tickets] DROP CONSTRAINT [DF_Tickets_channel]`);
    await queryRunner.query(`ALTER TABLE [Tickets] DROP COLUMN [channel]`);
  }
}
