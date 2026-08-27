import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerAttachments1759000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE [CustomerAttachments] (
        [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [customerId] uniqueidentifier NOT NULL,
        [uploadedByUserId] uniqueidentifier NOT NULL,
        [originalName] nvarchar(255) NOT NULL,
        [storedName] nvarchar(255) NOT NULL,
        [mimeType] nvarchar(150) NOT NULL,
        [sizeBytes] bigint NOT NULL,
        [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [deletedAt] datetime2 NULL,
        CONSTRAINT [FK_CustomerAttachments_Customer] FOREIGN KEY ([customerId])
          REFERENCES [Customers]([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_CustomerAttachments_User] FOREIGN KEY ([uploadedByUserId])
          REFERENCES [Users]([id]) ON DELETE NO ACTION
      )
    `);

    await queryRunner.query(`CREATE INDEX [IDX_CustomerAttachments_customerId] ON [CustomerAttachments]([customerId])`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE [CustomerAttachments]`);
  }
}
