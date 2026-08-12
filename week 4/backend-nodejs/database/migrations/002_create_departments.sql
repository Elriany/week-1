-- 002: Create Departments table (without managerId FK — added later to break circular dependency)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Departments')
BEGIN
  CREATE TABLE Departments (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    code        VARCHAR(20)   NOT NULL UNIQUE,
    name        NVARCHAR(100) NOT NULL,
    description NVARCHAR(500) NULL,
    isActive    BIT           NOT NULL DEFAULT 1,
    managerId   INT           NULL,
    createdAt   DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updatedAt   DATETIME2     NOT NULL DEFAULT GETUTCDATE()
  );
  PRINT 'Table [Departments] created.';
END
ELSE
  PRINT 'Table [Departments] already exists — skipped.';
