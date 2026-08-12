import apiClient from './client';
import { ApiResponse, PaginatedData } from '../types/api';
import { ApprovalRequest } from '../types/request';
import { ApprovalComment } from '../types/comment';
import { ApprovalHistory } from '../types/history';

export const requestApi = {
  async getAll(params?: { page?: number; pageSize?: number; search?: string; status?: string; type?: string }): Promise<ApiResponse<PaginatedData<ApprovalRequest>>> {
    const res = await apiClient.get<ApiResponse<PaginatedData<ApprovalRequest>>>('/requests', { params });
    return res.data;
  },

  async getById(id: number): Promise<ApiResponse<ApprovalRequest>> {
    const res = await apiClient.get<ApiResponse<ApprovalRequest>>(`/requests/${id}`);
    return res.data;
  },

  async create(data: Partial<ApprovalRequest>): Promise<ApiResponse<ApprovalRequest>> {
    const res = await apiClient.post<ApiResponse<ApprovalRequest>>('/requests', data);
    return res.data;
  },

  async submit(id: number): Promise<ApiResponse<ApprovalRequest>> {
    const res = await apiClient.post<ApiResponse<ApprovalRequest>>(`/requests/${id}/submit`);
    return res.data;
  },

  async approve(id: number, comment?: string): Promise<ApiResponse<ApprovalRequest>> {
    const res = await apiClient.post<ApiResponse<ApprovalRequest>>(`/requests/${id}/approve`, { comment });
    return res.data;
  },

  async reject(id: number, comment: string): Promise<ApiResponse<ApprovalRequest>> {
    const res = await apiClient.post<ApiResponse<ApprovalRequest>>(`/requests/${id}/reject`, { comment });
    return res.data;
  },

  async resubmit(id: number, comment?: string): Promise<ApiResponse<ApprovalRequest>> {
    const res = await apiClient.post<ApiResponse<ApprovalRequest>>(`/requests/${id}/resubmit`, { comment });
    return res.data;
  },

  async cancel(id: number): Promise<ApiResponse<ApprovalRequest>> {
    const res = await apiClient.post<ApiResponse<ApprovalRequest>>(`/requests/${id}/cancel`);
    return res.data;
  },

  async getComments(id: number): Promise<ApiResponse<ApprovalComment[]>> {
    const res = await apiClient.get<ApiResponse<ApprovalComment[]>>(`/requests/${id}/comments`);
    return res.data;
  },

  async addComment(id: number, comment: string): Promise<ApiResponse<ApprovalComment>> {
    const res = await apiClient.post<ApiResponse<ApprovalComment>>(`/requests/${id}/comments`, { comment });
    return res.data;
  },

  async getHistory(id: number): Promise<ApiResponse<ApprovalHistory[]>> {
    const res = await apiClient.get<ApiResponse<ApprovalHistory[]>>(`/requests/${id}/history`);
    return res.data;
  },
};
