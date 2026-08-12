-- 001: Create Roles table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Roles')
BEGIN
  CREATE TABLE Roles (
    id        INT IDENTITY(1,1) PRIMARY KEY,
    name      VARCHAR(50)  NOT NULL UNIQUE,
    createdAt DATETIME2    NOT NULL DEFAULT GETUTCDATE()
  );
  PRINT 'Table [Roles] created.';
END
ELSE
  PRINT 'Table [Roles] already exists — skipped.';
