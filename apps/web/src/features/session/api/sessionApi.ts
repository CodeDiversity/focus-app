import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/shared/api/rtkBaseQuery';
import type { VerificationResponse } from '@/features/auth/model/types';

/**
 * The shared RTK Query base query moved here from this module (D05-7) so the
 * dashboard's per-domain slices do not import across features. Re-exported so
 * existing importers of `features/session/api/sessionApi` keep working
 * unchanged; the transport itself is untouched.
 */
export { axiosBaseQuery } from '@/shared/api/rtkBaseQuery';
export type { AxiosBaseQueryArgs, AxiosBaseQueryError } from '@/shared/api/rtkBaseQuery';

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
