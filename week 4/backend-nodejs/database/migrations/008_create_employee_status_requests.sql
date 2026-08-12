-- 008: Create EmployeeStatusRequests table — links to ApprovalRequests for unified workflow
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EmployeeStatusRequests')
BEGIN
  CREATE TABLE EmployeeStatusRequests (
    id                INT IDENTITY(1,1) PRIMARY KEY,
    employeeId        INT            NOT NULL,
    requestedBy       INT            NOT NULL,
    departmentId      INT            NOT NULL,
    requestType       VARCHAR(30)    NOT NULL,
    status            VARCHAR(30)    NOT NULL DEFAULT 'PENDING',
    approvalRequestId INT            NULL,
    reason            NVARCHAR(1000) NULL,
    createdAt         DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    updatedAt         DATETIME2      NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_StatusReq_Employee  FOREIGN KEY (employeeId)        REFERENCES Users(id),
    CONSTRAINT FK_StatusReq_Requester FOREIGN KEY (requestedBy)       REFERENCES Users(id),
    CONSTRAINT FK_StatusReq_Dept      FOREIGN KEY (departmentId)      REFERENCES Departments(id),
    CONSTRAINT FK_StatusReq_Approval  FOREIGN KEY (approvalRequestId) REFERENCES ApprovalRequests(id),
    CONSTRAINT CK_StatusReq_Type     CHECK (requestType IN ('ACTIVATE_EMPLOYEE','DEACTIVATE_EMPLOYEE')),
    CONSTRAINT CK_StatusReq_Status   CHECK (status IN ('PENDING','APPROVED','REJECTED'))
  );
  PRINT 'Table [EmployeeStatusRequests] created.';
END
ELSE
  PRINT 'Table [EmployeeStatusRequests] already exists — skipped.';
