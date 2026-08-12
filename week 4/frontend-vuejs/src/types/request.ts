export type RequestType = 'GENERAL_APPROVAL' | 'MANAGER_REQUEST' | 'EMPLOYEE_ACTIVATION' | 'EMPLOYEE_DEACTIVATION';
export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type RequestStatus = 'DRAFT' | 'PENDING_MANAGER' | 'PENDING_ADMIN' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'RESUBMITTED';

export interface ApprovalRequest {
  id: number;
  requestNumber: string;
  title: string;
  description?: string;
  type: RequestType;
  priority: RequestPriority;
  status: RequestStatus;
  requesterId: number;
  requesterFirstName?: string;
  requesterLastName?: string;
  requesterEmail?: string;
  requesterRole?: string;
  requesterDepartmentName?: string;
  reviewerId?: number | null;
  reviewerFirstName?: string;
  reviewerLastName?: string;
  targetEmployeeId?: number | null;
  targetFirstName?: string;
  targetLastName?: string;
  targetEmployeeNumber?: string;
  attempt: number;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}
