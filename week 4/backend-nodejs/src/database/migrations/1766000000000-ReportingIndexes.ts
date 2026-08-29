import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Two indexes that serve the Story 27 reporting queries. `IDX_Tickets_branchId_statusId`
 * (Story 11) and `IDX_Tickets_resolvedAt` (Story 16) already exist and are not recreated.
 */
export class ReportingIndexes1766000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX [IDX_Tickets_branchId_assignedUserId] ON [Tickets]([branchId], [assignedUserId])`);
    await queryRunner.query(`CREATE INDEX [IDX_Tickets_branchId_createdAt] ON [Tickets]([branchId], [createdAt])`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX [IDX_Tickets_branchId_createdAt] ON [Tickets]`);
    await queryRunner.query(`DROP INDEX [IDX_Tickets_branchId_assignedUserId] ON [Tickets]`);
  }
}
