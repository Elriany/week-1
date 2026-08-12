export interface ApprovalComment {
  id: number;
  requestId: number;
  authorId: number;
  authorFirstName?: string;
  authorLastName?: string;
  authorEmail?: string;
  authorRole?: string;
  comment: string;
  createdAt: string;
  updatedAt?: string;
}
