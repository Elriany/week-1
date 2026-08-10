export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Approval {
  id: string;
  title: string;
  description: string;
  requesterId: string;
  status: ApprovalStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface ApprovalCreateRequest {
  title: string;
  description: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApprovalsResponseData {
  approvals: Approval[];
  pagination?: PaginationMeta;
}
