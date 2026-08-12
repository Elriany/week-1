export type StatusRequestType = 'ACTIVATE_EMPLOYEE' | 'DEACTIVATE_EMPLOYEE';
export type StatusRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface EmployeeStatusRequest {
  id: number;
  employeeId: number;
  employeeFirstName?: string;
  employeeLastName?: string;
  employeeEmail?: string;
  employeeNumber?: string;
  employeeCurrentStatus?: string;
  requestedBy: number;
  requestedByFirstName?: string;
  requestedByLastName?: string;
  departmentId: number;
  departmentName?: string;
  departmentCode?: string;
  requestType: StatusRequestType;
  status: StatusRequestStatus;
  approvalRequestId?: number | null;
  requestNumber?: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}
