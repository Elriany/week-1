-- 003: Create Users table with FKs to Roles and Departments
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
  CREATE TABLE Users (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    employeeNumber  VARCHAR(20)   NOT NULL UNIQUE,
    firstName       NVARCHAR(100) NOT NULL,
    lastName        NVARCHAR(100) NOT NULL,
    email           VARCHAR(255)  NOT NULL UNIQUE,
    phone           VARCHAR(20)   NULL,
    passwordHash    VARCHAR(255)  NOT NULL,
    roleId          INT           NOT NULL,
    departmentId    INT           NULL,
    status          VARCHAR(30)   NOT NULL DEFAULT 'ACTIVE',
    createdAt       DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updatedAt       DATETIME2     NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_Users_Roles       FOREIGN KEY (roleId)       REFERENCES Roles(id),
    CONSTRAINT FK_Users_Departments FOREIGN KEY (departmentId) REFERENCES Departments(id),
    CONSTRAINT CK_Users_Status      CHECK (status IN ('ACTIVE','INACTIVE','PENDING_ACTIVATION','PENDING_DEACTIVATION'))
  );
  PRINT 'Table [Users] created.';
END
ELSE
  PRINT 'Table [Users] already exists — skipped.';
