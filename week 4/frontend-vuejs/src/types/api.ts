export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ field?: string; message: string }>;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}
