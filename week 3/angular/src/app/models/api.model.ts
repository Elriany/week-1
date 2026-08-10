export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ field?: string; message: string }>;
  meta?: {
    timestamp: string;
    correlationId: string;
    version: string;
  };
}
