/**
 * The default payload type for an API call whose caller has not named a shape.
 *
 * This is the one place the app admits it does not type its network boundary:
 * callers read `response.data.items` and friends directly, which only `any`
 * permits. Narrow it by passing an explicit type argument — `api.get<Ticket>(…)`
 * — and when every endpoint has a declared response type, this alias goes away.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ApiPayload = any;

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
