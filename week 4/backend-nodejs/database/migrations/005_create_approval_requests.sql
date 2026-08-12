-- 005: Create ApprovalRequests table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ApprovalRequests')
BEGIN
  CREATE TABLE ApprovalRequests (
    id               INT IDENTITY(1,1) PRIMARY KEY,
    requestNumber    VARCHAR(20)    NOT NULL UNIQUE,
    title            NVARCHAR(200)  NOT NULL,
    description      NVARCHAR(2000) NULL,
    type             VARCHAR(30)    NOT NULL,
    priority         VARCHAR(20)    NOT NULL DEFAULT 'MEDIUM',
    status           VARCHAR(30)    NOT NULL DEFAULT 'DRAFT',
    requesterId      INT            NOT NULL,
    reviewerId       INT            NULL,
    targetEmployeeId INT            NULL,
    attempt          INT            NOT NULL DEFAULT 1,
    dueDate          DATE           NULL,
    createdAt        DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    updatedAt        DATETIME2      NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_Requests_Requester FOREIGN KEY (requesterId)      REFERENCES Users(id),
    CONSTRAINT FK_Requests_Reviewer  FOREIGN KEY (reviewerId)       REFERENCES Users(id),
    CONSTRAINT FK_Requests_Target    FOREIGN KEY (targetEmployeeId) REFERENCES Users(id),
    CONSTRAINT CK_Requests_Type     CHECK (type IN ('GENERAL_APPROVAL','MANAGER_REQUEST','EMPLOYEE_ACTIVATION','EMPLOYEE_DEACTIVATION')),
    CONSTRAINT CK_Requests_Priority CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
    CONSTRAINT CK_Requests_Status   CHECK (status IN ('DRAFT','PENDING_MANAGER','PENDING_ADMIN','APPROVED','REJECTED','CANCELLED','RESUBMITTED'))
  );
  PRINT 'Table [ApprovalRequests] created.';
END
ELSE
  PRINT 'Table [ApprovalRequests] already exists — skipped.';
