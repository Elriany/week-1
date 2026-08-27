import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerManagement1757000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Existing rows are active customers, so default 1 and backfill in one step.
    await queryRunner.query(`
      ALTER TABLE [Customers] ADD [isActive] bit NOT NULL CONSTRAINT [DF_Customers_isActive] DEFAULT 1
    `);

    // Search filters on active state within a branch; this index serves the common list query.
    await queryRunner.query(
      `CREATE INDEX [IDX_Customers_branchId_isActive] ON [Customers]([branchId], [isActive])`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX [IDX_Customers_branchId_isActive] ON [Customers]`);
    await queryRunner.query(`ALTER TABLE [Customers] DROP CONSTRAINT [DF_Customers_isActive]`);
    await queryRunner.query(`ALTER TABLE [Customers] DROP COLUMN [isActive]`);
  }
}
