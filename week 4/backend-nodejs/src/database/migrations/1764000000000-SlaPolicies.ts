import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Story 27 SLA: one policy per priority, plus the two ticket timestamps that
 * feed the computed status. Existing tickets get null stamps and are
 * evaluated as live clocks against their creation date — a ticket older than
 * its resolution target reads BREACHED immediately after this migration.
 * That is correct, not a bug.
 */
export class SlaPolicies1764000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE [SlaPolicies] (
        [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [priorityId] uniqueidentifier NOT NULL,
        [responseTargetMinutes] int NOT NULL,
        [resolutionTargetMinutes] int NOT NULL,
        [isActive] bit NOT NULL CONSTRAINT [DF_SlaPolicies_isActive] DEFAULT 1,
        [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [deletedAt] datetime2 NULL,
        CONSTRAINT [FK_SlaPolicies_priorityId] FOREIGN KEY ([priorityId])
          REFERENCES [TicketPriorities]([id]) ON DELETE NO ACTION
      )
    `);
    // priorityId is not null, so a plain unique index is correct here — no
    // filtered clause is needed as it was for Users.customerId.
    await queryRunner.query(`CREATE UNIQUE INDEX [UX_SlaPolicies_priorityId] ON [SlaPolicies]([priorityId])`);

    await queryRunner.query(`ALTER TABLE [Tickets] ADD [firstRespondedAt] datetime2 NULL`);
    await queryRunner.query(`ALTER TABLE [Tickets] ADD [resolvedAt] datetime2 NULL`);
    await queryRunner.query(`CREATE INDEX [IDX_Tickets_resolvedAt] ON [Tickets]([resolvedAt])`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX [IDX_Tickets_resolvedAt] ON [Tickets]`);
    await queryRunner.query(`ALTER TABLE [Tickets] DROP COLUMN [resolvedAt]`);
    await queryRunner.query(`ALTER TABLE [Tickets] DROP COLUMN [firstRespondedAt]`);
    await queryRunner.query(`DROP TABLE [SlaPolicies]`);
  }
}
