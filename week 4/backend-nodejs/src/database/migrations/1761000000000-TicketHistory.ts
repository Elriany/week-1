import { MigrationInterface, QueryRunner } from 'typeorm';

export class TicketHistory1761000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE [TicketHistory] (
        [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [ticketId] uniqueidentifier NOT NULL,
        [actorUserId] uniqueidentifier NOT NULL,
        [action] nvarchar(50) NOT NULL,
        [fromValue] nvarchar(500) NULL,
        [toValue] nvarchar(500) NOT NULL,
        [note] nvarchar(500) NULL,
        [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [deletedAt] datetime2 NULL
      )
    `);

    await queryRunner.query(`
      ALTER TABLE [TicketHistory] ADD CONSTRAINT [FK_TicketHistory_ticketId]
      FOREIGN KEY ([ticketId]) REFERENCES [Tickets]([id]) ON DELETE NO ACTION
    `);
    await queryRunner.query(`CREATE INDEX [IDX_TicketHistory_ticketId] ON [TicketHistory]([ticketId])`);

    await queryRunner.query(`
      ALTER TABLE [TicketHistory] ADD CONSTRAINT [FK_TicketHistory_actorUserId]
      FOREIGN KEY ([actorUserId]) REFERENCES [Users]([id]) ON DELETE NO ACTION
    `);
    await queryRunner.query(`CREATE INDEX [IDX_TicketHistory_actorUserId] ON [TicketHistory]([actorUserId])`);

    // For efficient pagination of a ticket's history in reverse chronological order
    await queryRunner.query(
      `CREATE INDEX [IDX_TicketHistory_ticketId_createdAt] ON [TicketHistory]([ticketId], [createdAt] DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX [IDX_TicketHistory_ticketId_createdAt] ON [TicketHistory]`);
    await queryRunner.query(`DROP INDEX [IDX_TicketHistory_actorUserId] ON [TicketHistory]`);
    await queryRunner.query(`ALTER TABLE [TicketHistory] DROP CONSTRAINT [FK_TicketHistory_actorUserId]`);
    await queryRunner.query(`DROP INDEX [IDX_TicketHistory_ticketId] ON [TicketHistory]`);
    await queryRunner.query(`ALTER TABLE [TicketHistory] DROP CONSTRAINT [FK_TicketHistory_ticketId]`);
    await queryRunner.query(`DROP TABLE [TicketHistory]`);
  }
}
