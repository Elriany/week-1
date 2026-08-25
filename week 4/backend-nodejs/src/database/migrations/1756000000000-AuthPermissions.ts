import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthPermissions1756000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Password storage on the existing Users table.
    // Nullable so the migration applies to existing rows; a NULL hash can never authenticate.
    await queryRunner.query(`
      ALTER TABLE [Users] ADD [passwordHash] nvarchar(255) NULL
    `);

    await queryRunner.query(`
      CREATE TABLE [Permissions] (
        [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [code] nvarchar(100) NOT NULL UNIQUE,
        [nameEn] nvarchar(200) NOT NULL,
        [nameAr] nvarchar(200) NOT NULL,
        [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [deletedAt] datetime2 NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX [IDX_Permissions_code] ON [Permissions]([code])`);

    await queryRunner.query(`
      CREATE TABLE [RolePermissions] (
        [roleId] uniqueidentifier NOT NULL,
        [permissionId] uniqueidentifier NOT NULL,
        CONSTRAINT [PK_RolePermissions] PRIMARY KEY ([roleId], [permissionId]),
        CONSTRAINT [FK_RolePermissions_Role] FOREIGN KEY ([roleId])
          REFERENCES [Roles]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_RolePermissions_Permission] FOREIGN KEY ([permissionId])
          REFERENCES [Permissions]([id]) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX [IDX_RolePermissions_roleId] ON [RolePermissions]([roleId])`);
    await queryRunner.query(`CREATE INDEX [IDX_RolePermissions_permissionId] ON [RolePermissions]([permissionId])`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE [RolePermissions]`);
    await queryRunner.query(`DROP TABLE [Permissions]`);
    await queryRunner.query(`ALTER TABLE [Users] DROP COLUMN [passwordHash]`);
  }
}
