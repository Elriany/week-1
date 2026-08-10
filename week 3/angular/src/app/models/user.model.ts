export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Employee';
  createdAt?: string;
}

export interface LoginResponseData {
  token: string;
  tokenType: string;
  user: User;
}
