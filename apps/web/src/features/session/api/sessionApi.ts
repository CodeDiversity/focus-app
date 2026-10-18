import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosRequestConfig, Method } from 'axios';
import httpClient from '@/shared/api/httpClient';
import type { VerificationResponse } from '@/features/auth/model/types';

/** Shape every endpoint passes to the baseQuery — transport details only. */
export interface AxiosBaseQueryArgs {
  url: string;
  method: Method;
  body?: unknown;
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
  const { url, method, body } = args;
  try {
    const config: AxiosRequestConfig = { url, method, data: body };
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

export const RESEND_INVALID_EMAIL_MESSAGE = 'Please enter a valid email address';
export const RESEND_FALLBACK_MESSAGE =
  'We could not request a verification email. Check your connection and try again.';

/**
 * Mirrors the messages `authService.resendVerification` throws. The mapping is
 * duplicated (not shared) so `features/auth/api/authService.ts` stays untouched, and is
 * pinned by the parity cases in `sessionApi.test.ts`.
 */
export function resendErrorMessage(code?: string): string {
  return code === '400' ? RESEND_INVALID_EMAIL_MESSAGE : RESEND_FALLBACK_MESSAGE;
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery,
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    resendVerification: builder.mutation<VerificationResponse, string>({
      query: (email) => ({
        url: '/auth/resend-verification',
        method: 'POST',
        body: { email },
      }),
    }),
  }),
});

export const { useResendVerificationMutation } = api;
