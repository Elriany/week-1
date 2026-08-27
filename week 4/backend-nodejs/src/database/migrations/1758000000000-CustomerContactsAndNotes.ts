import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerContactsAndNotes1758000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE [CustomerContacts] (
        [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [customerId] uniqueidentifier NOT NULL,
        [fullNameEn] nvarchar(200) NOT NULL,
        [fullNameAr] nvarchar(200) NOT NULL,
        [jobTitle] nvarchar(150) NULL,
        [email] nvarchar(255) NULL,
        [phone] nvarchar(20) NULL,
        [isPrimary] bit NOT NULL CONSTRAINT [DF_CustomerContacts_isPrimary] DEFAULT 0,
        [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [deletedAt] datetime2 NULL,
        CONSTRAINT [FK_CustomerContacts_Customer] FOREIGN KEY ([customerId])
          REFERENCES [Customers]([id]) ON DELETE NO ACTION
      )
    `);

    await queryRunner.query(`CREATE INDEX [IDX_CustomerContacts_customerId] ON [CustomerContacts]([customerId])`);

    await queryRunner.query(`
      CREATE TABLE [CustomerNotes] (
        [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [customerId] uniqueidentifier NOT NULL,
        [authorUserId] uniqueidentifier NOT NULL,
        [body] nvarchar(4000) NOT NULL,
        [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [deletedAt] datetime2 NULL,
        CONSTRAINT [FK_CustomerNotes_Customer] FOREIGN KEY ([customerId])
          REFERENCES [Customers]([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_CustomerNotes_User] FOREIGN KEY ([authorUserId])
          REFERENCES [Users]([id]) ON DELETE NO ACTION
      )
    `);

    await queryRunner.query(`CREATE INDEX [IDX_CustomerNotes_customerId] ON [CustomerNotes]([customerId])`);
    await queryRunner.query(`CREATE INDEX [IDX_CustomerNotes_authorUserId] ON [CustomerNotes]([authorUserId])`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE [CustomerNotes]`);
    await queryRunner.query(`DROP TABLE [CustomerContacts]`);
  }
}
