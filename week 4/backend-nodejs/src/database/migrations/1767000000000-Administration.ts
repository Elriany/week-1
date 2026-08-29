import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Story 27 administration: isActive on categories/priorities (never on
 * statuses — see ticketStatus.entity.ts), and the fix that lets the same
 * department code exist in more than one branch (SUPPORT in both HQ and
 * RIYADH, per Story 18's seed).
 *
 * The global uniqueness on Departments.code was originally created as an
 * inline column-level UNIQUE constraint, which SQL Server names with an
 * auto-generated, environment-specific suffix (`UQ__Departments__<hash>`) —
 * a literal name here would work on this database and fail on a fresh one.
 * This migration looks the name up at runtime instead.
 */
export class Administration1767000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE [TicketCategories] ADD [isActive] bit NOT NULL
        CONSTRAINT [DF_TicketCategories_isActive] DEFAULT 1
    `);
    await queryRunner.query(`
      ALTER TABLE [TicketPriorities] ADD [isActive] bit NOT NULL
        CONSTRAINT [DF_TicketPriorities_isActive] DEFAULT 1
    `);

    // Drop whatever single-column unique constraint/index currently enforces
    // global uniqueness on Departments.code (excluding the primary key and
    // the (branchId, code) composite), found by shape rather than by name.
    await queryRunner.query(`
      DECLARE @constraintName sysname;
      DECLARE @isKeyConstraint bit;

      SELECT TOP 1
        @constraintName = i.name,
        @isKeyConstraint = CASE WHEN kc.name IS NOT NULL THEN 1 ELSE 0 END
      FROM sys.indexes i
      LEFT JOIN sys.key_constraints kc ON kc.parent_object_id = i.object_id AND kc.name = i.name
      WHERE i.object_id = OBJECT_ID('Departments')
        AND i.is_unique = 1
        AND i.is_primary_key = 0
        AND (
          SELECT COUNT(*) FROM sys.index_columns ic
          WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id
        ) = 1
        AND EXISTS (
          SELECT 1 FROM sys.index_columns ic
          JOIN sys.columns col ON col.object_id = ic.object_id AND col.column_id = ic.column_id
          WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND col.name = 'code'
        );

      IF @constraintName IS NOT NULL
      BEGIN
        IF @isKeyConstraint = 1
          EXEC('ALTER TABLE [Departments] DROP CONSTRAINT [' + @constraintName + ']');
        ELSE
          EXEC('DROP INDEX [' + @constraintName + '] ON [Departments]');
      END
    `);

    // A plain, non-unique index on code remains for lookups — create it only
    // if this database does not already have one.
    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('Departments') AND name = 'IDX_Departments_code'
      )
        CREATE INDEX [IDX_Departments_code] ON [Departments]([code])
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restoring the global unique constraint fails if two branches now share
    // a department code — deduplicate by hand first. This is the one
    // non-mechanical revert in the feature.
    await queryRunner.query(`ALTER TABLE [Departments] ADD CONSTRAINT [UQ_Departments_code] UNIQUE ([code])`);

    await queryRunner.query(`ALTER TABLE [TicketPriorities] DROP CONSTRAINT [DF_TicketPriorities_isActive]`);
    await queryRunner.query(`ALTER TABLE [TicketPriorities] DROP COLUMN [isActive]`);
    await queryRunner.query(`ALTER TABLE [TicketCategories] DROP CONSTRAINT [DF_TicketCategories_isActive]`);
    await queryRunner.query(`ALTER TABLE [TicketCategories] DROP COLUMN [isActive]`);
  }
}
