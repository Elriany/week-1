import { ApiError, type ApiErrorBody } from '@/types/api';

// TODO (Story 04 follow-up): Backend API error messages are English-only.
// Localizing them requires an Accept-Language header and a server-side catalogue.
// Until then, the UI displays error messages by error.code looked up in the
// errors namespace where a translation exists, falling back to the server's English message.

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

/**
 * Supplies the current bearer token. The auth store registers its getter at
 * startup; keeping it as a callback avoids a circular import between the store
 * (which calls the client) and the client (which needs the store's token).
 */
let tokenProvider: () => string | null = () => null;

/** Invoked when the API rejects a request with 401, so the app can sign out. */
let unauthorizedHandler: () => void = () => {};

export function setTokenProvider(provider: () => string | null): void {
  tokenProvider = provider;
}

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

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

  const token = tokenProvider();

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      'Accept': 'application/json',
      'x-correlation-id': correlationId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  };

  if (options.body && typeof options.body === 'object' && !isFormData) {
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

    // A 401 means the session is gone — expired, revoked, or the account was
    // deactivated. Let the app clear its state rather than leaving a dead token
    // in place for every subsequent request.
    if (response.status === 401) {
      unauthorizedHandler();
    }

    throw new ApiError(
      response.status,
      errorBody.error?.code || 'UNKNOWN_ERROR',
      errorBody.error?.details,
      errorBody.correlationId,
      errorBody.error?.message,
    );
  }

  return data as T;
}

async function downloadFile(endpoint: string): Promise<void> {
  const token = tokenProvider();
  const correlationId = generateCorrelationId();

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'x-correlation-id': correlationId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json() as ApiErrorBody;
      throw new ApiError(
        response.status,
        data.error?.code || 'UNKNOWN_ERROR',
        data.error?.details,
        data.correlationId,
        data.error?.message,
      );
    }
    throw new ApiError(response.status, 'DOWNLOAD_FAILED', undefined, correlationId);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'download';
  link.click();
  URL.revokeObjectURL(url);
}

export const api = {
  get: <T = any>(endpoint: string) => apiCall<T>(endpoint, { method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any) =>
    apiCall<T>(endpoint, { method: 'POST', body }),
  put: <T = any>(endpoint: string, body?: any) =>
    apiCall<T>(endpoint, { method: 'PUT', body }),
  patch: <T = any>(endpoint: string, body?: any) =>
    apiCall<T>(endpoint, { method: 'PATCH', body }),
  delete: <T = any>(endpoint: string) => apiCall<T>(endpoint, { method: 'DELETE' }),
  upload: <T = any>(endpoint: string, formData: FormData) =>
    apiCall<T>(endpoint, { method: 'POST', body: formData }),
  download: (endpoint: string) => downloadFile(endpoint),
};
