import api from './api';
import { Approval, ApprovalCreateRequest, ApprovalsResponseData } from '../types/approval';
import { ApiResponse } from '../types/api';

export const approvalService = {
  async getApprovals(): Promise<ApiResponse<ApprovalsResponseData>> {
    const response = await api.get<ApiResponse<ApprovalsResponseData>>('/approvals');
    return response.data;
  },

  async createApproval(payload: ApprovalCreateRequest): Promise<ApiResponse<Approval>> {
    const response = await api.post<ApiResponse<Approval>>('/approvals', payload);
    return response.data;
  }
};
