-- 007: Create ApprovalHistory (audit trail) table — immutable, insert-only
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ApprovalHistory')
BEGIN
  CREATE TABLE ApprovalHistory (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    requestId   INT            NOT NULL,
    action      VARCHAR(50)    NOT NULL,
    fromStatus  VARCHAR(30)    NULL,
    toStatus    VARCHAR(30)    NULL,
    performedBy INT            NOT NULL,
    comment     NVARCHAR(1000) NULL,
    createdAt   DATETIME2      NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_History_Request   FOREIGN KEY (requestId)   REFERENCES ApprovalRequests(id),
    CONSTRAINT FK_History_Performer FOREIGN KEY (performedBy) REFERENCES Users(id)
  );
  PRINT 'Table [ApprovalHistory] created.';
END
ELSE
  PRINT 'Table [ApprovalHistory] already exists — skipped.';
