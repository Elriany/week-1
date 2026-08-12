-- 009: Create performance indexes
-- Users
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_Email')
  CREATE INDEX IX_Users_Email ON Users(email);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_DepartmentId')
  CREATE INDEX IX_Users_DepartmentId ON Users(departmentId);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_RoleId')
  CREATE INDEX IX_Users_RoleId ON Users(roleId);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_Status')
  CREATE INDEX IX_Users_Status ON Users(status);

-- ApprovalRequests
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Requests_RequesterId')
  CREATE INDEX IX_Requests_RequesterId ON ApprovalRequests(requesterId);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Requests_Status')
  CREATE INDEX IX_Requests_Status ON ApprovalRequests(status);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Requests_Type')
  CREATE INDEX IX_Requests_Type ON ApprovalRequests(type);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Requests_CreatedAt')
  CREATE INDEX IX_Requests_CreatedAt ON ApprovalRequests(createdAt);

-- ApprovalComments
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Comments_RequestId')
  CREATE INDEX IX_Comments_RequestId ON ApprovalComments(requestId);

-- ApprovalHistory
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_History_RequestId')
  CREATE INDEX IX_History_RequestId ON ApprovalHistory(requestId);

-- EmployeeStatusRequests
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_StatusReq_EmployeeId')
  CREATE INDEX IX_StatusReq_EmployeeId ON EmployeeStatusRequests(employeeId);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_StatusReq_Status')
  CREATE INDEX IX_StatusReq_Status ON EmployeeStatusRequests(status);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_StatusReq_ApprovalRequestId')
  CREATE INDEX IX_StatusReq_ApprovalRequestId ON EmployeeStatusRequests(approvalRequestId);

PRINT 'Indexes created/verified.';
