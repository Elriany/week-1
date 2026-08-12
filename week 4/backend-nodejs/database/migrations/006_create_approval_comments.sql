-- 006: Create ApprovalComments table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ApprovalComments')
BEGIN
  CREATE TABLE ApprovalComments (
    id        INT IDENTITY(1,1) PRIMARY KEY,
    requestId INT            NOT NULL,
    authorId  INT            NOT NULL,
    comment   NVARCHAR(2000) NOT NULL,
    createdAt DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    updatedAt DATETIME2      NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_Comments_Request FOREIGN KEY (requestId) REFERENCES ApprovalRequests(id),
    CONSTRAINT FK_Comments_Author  FOREIGN KEY (authorId)  REFERENCES Users(id)
  );
  PRINT 'Table [ApprovalComments] created.';
END
ELSE
  PRINT 'Table [ApprovalComments] already exists — skipped.';
