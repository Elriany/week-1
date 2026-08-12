import apiClient from './client';
import { ApiResponse, PaginatedData } from '../types/api';
import { Department } from '../types/department';

export const departmentApi = {
  async getAll(params?: { page?: number; pageSize?: number; search?: string }): Promise<ApiResponse<PaginatedData<Department>>> {
    const res = await apiClient.get<ApiResponse<PaginatedData<Department>>>('/departments', { params });
    return res.data;
  },

  async getById(id: number): Promise<ApiResponse<Department>> {
    const res = await apiClient.get<ApiResponse<Department>>(`/departments/${id}`);
    return res.data;
  },

  async create(data: Partial<Department>): Promise<ApiResponse<Department>> {
    const res = await apiClient.post<ApiResponse<Department>>('/departments', data);
    return res.data;
  },

  async update(id: number, data: Partial<Department>): Promise<ApiResponse<Department>> {
    const res = await apiClient.put<ApiResponse<Department>>(`/departments/${id}`, data);
    return res.data;
  },
};
