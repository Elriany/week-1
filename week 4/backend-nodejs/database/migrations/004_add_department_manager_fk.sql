-- 004: Add Departments.managerId FK to Users (resolves circular dependency)
IF NOT EXISTS (
  SELECT * FROM sys.foreign_keys WHERE name = 'FK_Departments_Manager'
)
BEGIN
  ALTER TABLE Departments
    ADD CONSTRAINT FK_Departments_Manager
    FOREIGN KEY (managerId) REFERENCES Users(id);
  PRINT 'FK [FK_Departments_Manager] added to Departments.';
END
ELSE
  PRINT 'FK [FK_Departments_Manager] already exists — skipped.';
