import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosRequestConfig, Method } from 'axios';
import httpClient from '@/shared/api/httpClient';

/**
 * Shape every endpoint passes to the baseQuery — transport details only.
 *
 * `params` is optional and is forwarded to the axios config unchanged. The
 * session API never passes it (its request shape is unchanged); the dashboard's
 * calendar slice passes `from`/`to` — the only two parameters
 * `GET /calendar/events` whitelists.
 */
export interface AxiosBaseQueryArgs {
  url: string;
  method: Method;
  body?: unknown;
  params?: Record<string, string>;
}

/**
 * RTK's `miniSerializeError` copies only the *string* properties `name`,
 * `message`, `stack` and `code`, so the HTTP status travels as `code`.
 */
export interface AxiosBaseQueryError {
  message: string;
  code?: string;
}

/**
 * Every RTK Query request goes through the shared `shared/api/httpClient.ts` axios
 * instance, so the SP-105G interceptor chain (bearer token, single-flight
 * refresh, recovery barrier, session generations, `AUTH_PATHS`, error
 * sanitization) stays the single transport — RD4.
 */
export const axiosBaseQuery: BaseQueryFn<AxiosBaseQueryArgs, unknown, AxiosBaseQueryError> = async (
  args
) => {
  const { url, method, body, params } = args;
  try {
    const config: AxiosRequestConfig = { url, method, data: body };
    // Only set `params` when the endpoint has some: an unset value keeps the
    // request free of any query string.
    if (params) config.params = params;
    const response = await httpClient.request(config);
    return { data: response.data };
  } catch (error: unknown) {
    // The response interceptor rejects with `{ ...error, message }`, which keeps
    // `response.status` readable (authService relies on the same shape).
    const failure = error as { message?: string; response?: { status?: number } };
    const status = failure.response?.status;
    return {
      error: {
        message: failure.message ?? 'An unexpected error occurred',
        code: status === undefined ? undefined : String(status),
      },
    };
  }
};
