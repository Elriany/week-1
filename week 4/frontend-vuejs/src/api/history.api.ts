import apiClient from './client';
import { ApiResponse, PaginatedData } from '../types/api';
import { ApprovalHistory } from '../types/history';

export const historyApi = {
  async getAll(params?: { page?: number; pageSize?: number; search?: string; action?: string }): Promise<ApiResponse<PaginatedData<ApprovalHistory>>> {
    const res = await apiClient.get<ApiResponse<PaginatedData<ApprovalHistory>>>('/audit/history', { params });
    return res.data;
  },
};
