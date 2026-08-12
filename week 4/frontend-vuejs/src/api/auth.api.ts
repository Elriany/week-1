import apiClient from './client';
import { ApiResponse } from '../types/api';
import { LoginResponseData, User } from '../types/user';

export const authApi = {
  async login(email: string, password: string): Promise<ApiResponse<LoginResponseData>> {
    const res = await apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', { email, password });
    return res.data;
  },

  async me(): Promise<ApiResponse<User>> {
    const res = await apiClient.get<ApiResponse<User>>('/auth/me');
    return res.data;
  },
};
