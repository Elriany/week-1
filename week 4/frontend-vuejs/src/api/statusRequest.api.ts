import apiClient from './client';
import { ApiResponse, PaginatedData } from '../types/api';
import { EmployeeStatusRequest } from '../types/statusRequest';

export const statusRequestApi = {
  async getAll(params?: { page?: number; pageSize?: number; status?: string; requestType?: string }): Promise<ApiResponse<PaginatedData<EmployeeStatusRequest>>> {
    const res = await apiClient.get<ApiResponse<PaginatedData<EmployeeStatusRequest>>>('/status-requests', { params });
    return res.data;
  },

  async getById(id: number): Promise<ApiResponse<EmployeeStatusRequest>> {
    const res = await apiClient.get<ApiResponse<EmployeeStatusRequest>>(`/status-requests/${id}`);
    return res.data;
  },

  async approve(id: number, comment?: string): Promise<ApiResponse<EmployeeStatusRequest>> {
    const res = await apiClient.post<ApiResponse<EmployeeStatusRequest>>(`/status-requests/${id}/approve`, { comment });
    return res.data;
  },

  async reject(id: number, comment: string): Promise<ApiResponse<EmployeeStatusRequest>> {
    const res = await apiClient.post<ApiResponse<EmployeeStatusRequest>>(`/status-requests/${id}/reject`, { comment });
    return res.data;
  },
};
