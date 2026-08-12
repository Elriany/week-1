import apiClient from './client';
import { ApiResponse } from '../types/api';
import { DashboardData } from '../types/dashboard';

export const dashboardApi = {
  async getDashboard(): Promise<ApiResponse<DashboardData>> {
    const res = await apiClient.get<ApiResponse<DashboardData>>('/dashboard');
    return res.data;
  },
};
