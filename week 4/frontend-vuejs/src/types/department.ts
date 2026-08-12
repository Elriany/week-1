export interface Department {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  managerId?: number | null;
  managerFirstName?: string;
  managerLastName?: string;
  managerEmail?: string;
  employeeCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
