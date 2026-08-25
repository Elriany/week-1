import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialCrmSchema1724086800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE [Branches] (
        [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [code] nvarchar(50) NOT NULL UNIQUE,
        [nameEn] nvarchar(200) NOT NULL,
        [nameAr] nvarchar(200) NOT NULL,
        [isActive] bit NOT NULL DEFAULT 1,
        [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [deletedAt] datetime2 NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX [IDX_Branches_code] ON [Branches]([code])`);

    await queryRunner.query(`
      CREATE TABLE [Departments] (
        [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [branchId] uniqueidentifier NOT NULL,
        [code] nvarchar(50) NOT NULL UNIQUE,
        [nameEn] nvarchar(200) NOT NULL,
        [nameAr] nvarchar(200) NOT NULL,
        [isActive] bit NOT NULL DEFAULT 1,
        [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [deletedAt] datetime2 NULL,
        FOREIGN KEY ([branchId]) REFERENCES [Branches]([id]) ON DELETE NO ACTION
      )
    `);

    await queryRunner.query(`CREATE INDEX [IDX_Departments_branchId] ON [Departments]([branchId])`);
    await queryRunner.query(`CREATE INDEX [IDX_Departments_code] ON [Departments]([code])`);
    await queryRunner.query(`CREATE INDEX [IDX_Departments_branchId_code] ON [Departments]([branchId], [code])`);

    await queryRunner.query(`
      CREATE TABLE [Roles] (
        [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [code] nvarchar(50) NOT NULL UNIQUE,
        [nameEn] nvarchar(200) NOT NULL,
        [nameAr] nvarchar(200) NOT NULL,
        [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [deletedAt] datetime2 NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX [IDX_Roles_code] ON [Roles]([code])`);

    await queryRunner.query(`
      CREATE TABLE [Users] (
        [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [branchId] uniqueidentifier NOT NULL,
        [departmentId] uniqueidentifier NOT NULL,
        [roleId] uniqueidentifier NOT NULL,
        [email] nvarchar(255) NOT NULL UNIQUE,
        [fullNameEn] nvarchar(200) NOT NULL,
        [fullNameAr] nvarchar(200) NOT NULL,
        [isActive] bit NOT NULL DEFAULT 1,
        [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [deletedAt] datetime2 NULL,
        FOREIGN KEY ([branchId]) REFERENCES [Branches]([id]) ON DELETE NO ACTION,
        FOREIGN KEY ([departmentId]) REFERENCES [Departments]([id]) ON DELETE NO ACTION,
        FOREIGN KEY ([roleId]) REFERENCES [Roles]([id]) ON DELETE NO ACTION
      )
    `);

    await queryRunner.query(`CREATE INDEX [IDX_Users_branchId] ON [Users]([branchId])`);
    await queryRunner.query(`CREATE INDEX [IDX_Users_departmentId] ON [Users]([departmentId])`);
    await queryRunner.query(`CREATE INDEX [IDX_Users_roleId] ON [Users]([roleId])`);
    await queryRunner.query(`CREATE INDEX [IDX_Users_email] ON [Users]([email])`);
    await queryRunner.query(`CREATE INDEX [IDX_Users_branchId_departmentId] ON [Users]([branchId], [departmentId])`);

    await queryRunner.query(`
      CREATE TABLE [Customers] (
        [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [branchId] uniqueidentifier NOT NULL,
        [code] nvarchar(50) NOT NULL UNIQUE,
        [fullNameEn] nvarchar(200) NOT NULL,
        [fullNameAr] nvarchar(200) NOT NULL,
        [email] nvarchar(255) NULL,
        [phone] nvarchar(20) NULL,
        [preferredLanguage] nvarchar(2) NOT NULL DEFAULT 'en',
        [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [deletedAt] datetime2 NULL,
        FOREIGN KEY ([branchId]) REFERENCES [Branches]([id]) ON DELETE NO ACTION
      )
    `);

    await queryRunner.query(`CREATE INDEX [IDX_Customers_branchId] ON [Customers]([branchId])`);
    await queryRunner.query(`CREATE INDEX [IDX_Customers_code] ON [Customers]([code])`);

    await queryRunner.query(`
      CREATE TABLE [TicketStatuses] (
        [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [code] nvarchar(50) NOT NULL UNIQUE,
        [nameEn] nvarchar(200) NOT NULL,
        [nameAr] nvarchar(200) NOT NULL,
        [sortOrder] int NOT NULL DEFAULT 0,
        [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [deletedAt] datetime2 NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX [IDX_TicketStatuses_code] ON [TicketStatuses]([code])`);

    await queryRunner.query(`
      CREATE TABLE [TicketPriorities] (
        [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [code] nvarchar(50) NOT NULL UNIQUE,
        [nameEn] nvarchar(200) NOT NULL,
        [nameAr] nvarchar(200) NOT NULL,
        [sortOrder] int NOT NULL DEFAULT 0,
        [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [deletedAt] datetime2 NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX [IDX_TicketPriorities_code] ON [TicketPriorities]([code])`);

    await queryRunner.query(`
      CREATE TABLE [Tickets] (
        [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [ticketNumber] nvarchar(50) NOT NULL UNIQUE,
        [branchId] uniqueidentifier NOT NULL,
        [departmentId] uniqueidentifier NOT NULL,
        [customerId] uniqueidentifier NOT NULL,
        [assignedUserId] uniqueidentifier NULL,
        [statusId] uniqueidentifier NOT NULL,
        [priorityId] uniqueidentifier NOT NULL,
        [subject] nvarchar(300) NOT NULL,
        [description] nvarchar(4000) NOT NULL,
        [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [deletedAt] datetime2 NULL,
        FOREIGN KEY ([branchId]) REFERENCES [Branches]([id]) ON DELETE NO ACTION,
        FOREIGN KEY ([departmentId]) REFERENCES [Departments]([id]) ON DELETE NO ACTION,
        FOREIGN KEY ([customerId]) REFERENCES [Customers]([id]) ON DELETE NO ACTION,
        FOREIGN KEY ([assignedUserId]) REFERENCES [Users]([id]) ON DELETE NO ACTION,
        FOREIGN KEY ([statusId]) REFERENCES [TicketStatuses]([id]) ON DELETE NO ACTION,
        FOREIGN KEY ([priorityId]) REFERENCES [TicketPriorities]([id]) ON DELETE NO ACTION
      )
    `);

    await queryRunner.query(`CREATE INDEX [IDX_Tickets_ticketNumber] ON [Tickets]([ticketNumber])`);
    await queryRunner.query(`CREATE INDEX [IDX_Tickets_branchId] ON [Tickets]([branchId])`);
    await queryRunner.query(`CREATE INDEX [IDX_Tickets_departmentId] ON [Tickets]([departmentId])`);
    await queryRunner.query(`CREATE INDEX [IDX_Tickets_customerId] ON [Tickets]([customerId])`);
    await queryRunner.query(`CREATE INDEX [IDX_Tickets_assignedUserId] ON [Tickets]([assignedUserId])`);
    await queryRunner.query(`CREATE INDEX [IDX_Tickets_statusId] ON [Tickets]([statusId])`);
    await queryRunner.query(`CREATE INDEX [IDX_Tickets_priorityId] ON [Tickets]([priorityId])`);
    await queryRunner.query(`CREATE INDEX [IDX_Tickets_branchId_departmentId] ON [Tickets]([branchId], [departmentId])`);

    await queryRunner.query(`
      CREATE TABLE [TicketComments] (
        [id] uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [ticketId] uniqueidentifier NOT NULL,
        [authorUserId] uniqueidentifier NOT NULL,
        [body] nvarchar(4000) NOT NULL,
        [isInternal] bit NOT NULL DEFAULT 0,
        [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
        [deletedAt] datetime2 NULL,
        FOREIGN KEY ([ticketId]) REFERENCES [Tickets]([id]) ON DELETE NO ACTION,
        FOREIGN KEY ([authorUserId]) REFERENCES [Users]([id]) ON DELETE NO ACTION
      )
    `);

    await queryRunner.query(`CREATE INDEX [IDX_TicketComments_ticketId] ON [TicketComments]([ticketId])`);
    await queryRunner.query(`CREATE INDEX [IDX_TicketComments_authorUserId] ON [TicketComments]([authorUserId])`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX [IDX_TicketComments_authorUserId] ON [TicketComments]`);
    await queryRunner.query(`DROP INDEX [IDX_TicketComments_ticketId] ON [TicketComments]`);
    await queryRunner.query(`DROP TABLE [TicketComments]`);

    await queryRunner.query(`DROP INDEX [IDX_Tickets_branchId_departmentId] ON [Tickets]`);
    await queryRunner.query(`DROP INDEX [IDX_Tickets_priorityId] ON [Tickets]`);
    await queryRunner.query(`DROP INDEX [IDX_Tickets_statusId] ON [Tickets]`);
    await queryRunner.query(`DROP INDEX [IDX_Tickets_assignedUserId] ON [Tickets]`);
    await queryRunner.query(`DROP INDEX [IDX_Tickets_customerId] ON [Tickets]`);
    await queryRunner.query(`DROP INDEX [IDX_Tickets_departmentId] ON [Tickets]`);
    await queryRunner.query(`DROP INDEX [IDX_Tickets_branchId] ON [Tickets]`);
    await queryRunner.query(`DROP INDEX [IDX_Tickets_ticketNumber] ON [Tickets]`);
    await queryRunner.query(`DROP TABLE [Tickets]`);

    await queryRunner.query(`DROP INDEX [IDX_TicketPriorities_code] ON [TicketPriorities]`);
    await queryRunner.query(`DROP TABLE [TicketPriorities]`);

    await queryRunner.query(`DROP INDEX [IDX_TicketStatuses_code] ON [TicketStatuses]`);
    await queryRunner.query(`DROP TABLE [TicketStatuses]`);

    await queryRunner.query(`DROP INDEX [IDX_Customers_code] ON [Customers]`);
    await queryRunner.query(`DROP INDEX [IDX_Customers_branchId] ON [Customers]`);
    await queryRunner.query(`DROP TABLE [Customers]`);

    await queryRunner.query(`DROP INDEX [IDX_Users_branchId_departmentId] ON [Users]`);
    await queryRunner.query(`DROP INDEX [IDX_Users_email] ON [Users]`);
    await queryRunner.query(`DROP INDEX [IDX_Users_roleId] ON [Users]`);
    await queryRunner.query(`DROP INDEX [IDX_Users_departmentId] ON [Users]`);
    await queryRunner.query(`DROP INDEX [IDX_Users_branchId] ON [Users]`);
    await queryRunner.query(`DROP TABLE [Users]`);

    await queryRunner.query(`DROP INDEX [IDX_Roles_code] ON [Roles]`);
    await queryRunner.query(`DROP TABLE [Roles]`);

    await queryRunner.query(`DROP INDEX [IDX_Departments_branchId_code] ON [Departments]`);
    await queryRunner.query(`DROP INDEX [IDX_Departments_code] ON [Departments]`);
    await queryRunner.query(`DROP INDEX [IDX_Departments_branchId] ON [Departments]`);
    await queryRunner.query(`DROP TABLE [Departments]`);

    await queryRunner.query(`DROP INDEX [IDX_Branches_code] ON [Branches]`);
    await queryRunner.query(`DROP TABLE [Branches]`);
  }
}
