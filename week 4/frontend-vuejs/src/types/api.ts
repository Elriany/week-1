export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  correlationId?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
    public readonly correlationId?: string,
    /**
     * The server's English message. Story 04 recorded that API errors are not
     * localized; the UI prefers a translation of `code` and falls back to this.
     */
    public readonly serverMessage?: string,
  ) {
    super(serverMessage ?? code);
    this.name = 'ApiError';
  }
}
