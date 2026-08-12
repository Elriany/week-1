export type Role = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING_ACTIVATION' | 'PENDING_DEACTIVATION';

export interface User {
  id: number;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: Role;
  roleId?: number;
  roleName?: string;
  departmentId?: number | null;
  departmentName?: string | null;
  departmentCode?: string | null;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponseData {
  accessToken: string;
  tokenType: string;
  user: User;
}
