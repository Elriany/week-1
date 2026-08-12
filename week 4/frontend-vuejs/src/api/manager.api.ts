import apiClient from './client';
import { ApiResponse, PaginatedData } from '../types/api';
import { User } from '../types/user';

export const managerApi = {
  async getAll(params?: { page?: number; pageSize?: number; search?: string }): Promise<ApiResponse<PaginatedData<User>>> {
    const res = await apiClient.get<ApiResponse<PaginatedData<User>>>('/managers', { params });
    return res.data;
  },

  async create(data: Partial<User>): Promise<ApiResponse<User>> {
    const res = await apiClient.post<ApiResponse<User>>('/managers', data);
    return res.data;
  },

  async update(id: number, data: Partial<User>): Promise<ApiResponse<User>> {
    const res = await apiClient.put<ApiResponse<User>>(`/managers/${id}`, data);
    return res.data;
  },
};
