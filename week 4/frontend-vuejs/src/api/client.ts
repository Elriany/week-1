import { ApiError, type ApiErrorBody } from '@/types/api';

// TODO (Story 04 follow-up): Backend API error messages are English-only.
// Localizing them requires an Accept-Language header and a server-side catalogue.
// Until then, the UI displays error messages by error.code looked up in the
// errors namespace where a translation exists, falling back to the server's English message.

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

function generateCorrelationId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return Math.random().toString(36).substr(2, 9);
}

interface FetchOptions extends RequestInit {
  body?: any;
}

export async function apiCall<T = any>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const correlationId = generateCorrelationId();

  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-correlation-id': correlationId,
      ...options.headers,
    },
  };

  if (options.body && typeof options.body === 'object') {
    fetchOptions.body = JSON.stringify(options.body);
  }

  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${endpoint}`, fetchOptions);
  } catch (err) {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      undefined,
      correlationId,
    );
  }

  // Check content type
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new ApiError(
      response.status,
      'INVALID_RESPONSE',
      'Backend returned non-JSON response',
      correlationId,
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  let data: any;
  try {
    data = await response.json();
  } catch (err) {
    throw new ApiError(
      response.status,
      'PARSE_ERROR',
      'Failed to parse response',
      correlationId,
    );
  }

  // Handle error responses
  if (!response.ok) {
    const errorBody = data as ApiErrorBody;
    throw new ApiError(
      response.status,
      errorBody.error?.code || 'UNKNOWN_ERROR',
      errorBody.error?.details,
      errorBody.correlationId,
    );
  }

  return data as T;
}

export const api = {
  get: <T = any>(endpoint: string) => apiCall<T>(endpoint, { method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any) =>
    apiCall<T>(endpoint, { method: 'POST', body }),
  put: <T = any>(endpoint: string, body?: any) =>
    apiCall<T>(endpoint, { method: 'PUT', body }),
  delete: <T = any>(endpoint: string) => apiCall<T>(endpoint, { method: 'DELETE' }),
};
