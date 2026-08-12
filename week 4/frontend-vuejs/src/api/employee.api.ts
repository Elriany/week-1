import apiClient from './client';
import { ApiResponse, PaginatedData } from '../types/api';
import { User } from '../types/user';

export const employeeApi = {
  async getAll(params?: { page?: number; pageSize?: number; search?: string; status?: string; departmentId?: string }): Promise<ApiResponse<PaginatedData<User>>> {
    const res = await apiClient.get<ApiResponse<PaginatedData<User>>>('/employees', { params });
    return res.data;
  },

  async getById(id: number): Promise<ApiResponse<User>> {
    const res = await apiClient.get<ApiResponse<User>>(`/employees/${id}`);
    return res.data;
  },

  async create(data: Partial<User>): Promise<ApiResponse<User>> {
    const res = await apiClient.post<ApiResponse<User>>('/employees', data);
    return res.data;
  },

  async requestActivation(id: number, reason?: string): Promise<ApiResponse<any>> {
    const res = await apiClient.post<ApiResponse<any>>(`/employees/${id}/activation-request`, { reason });
    return res.data;
  },

  async requestDeactivation(id: number, reason?: string): Promise<ApiResponse<any>> {
    const res = await apiClient.post<ApiResponse<any>>(`/employees/${id}/deactivation-request`, { reason });
    return res.data;
  },
};
