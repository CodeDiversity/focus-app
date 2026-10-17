import { ApiError } from '@/shared/api/types';

export function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return 'An unexpected error occurred';
}

/**
 * SP-106C — the parsed ApiError body an axios rejection (or the api
 * interceptor's spread rejection) carries at `response.data`. The update
 * profile flow forwards this through the redux rejection so the SP-106B
 * field-level 400 map (D106-6) can reach the Profile form.
 */
export function extractApiError(error: unknown): ApiError | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const data = (error as { response?: { data?: unknown } }).response?.data;
  if (typeof data === 'object' && data !== null && 'statusCode' in data) {
    return data as ApiError;
  }
  return undefined;
}

/**
 * A human message for an ApiError body: the SP-106B validation 400s preserve
 * the stock constraint messages as a string array (D106-6), which joins into
 * one sanitized sentence; string messages pass through unchanged.
 */
export function apiErrorMessage(apiError: ApiError): string {
  return Array.isArray(apiError.message)
    ? apiError.message.join(' ')
    : apiError.message;
}

/**
 * SP-106C — first field-level message for `field` from an API 400 whose body
 * carries the SP-106B `errors` map (`{ errors: { <field>: string[] } }`).
 *
 * Accepts anything the update flow can throw: the Error thrown by the
 * updateProfile adapter (with the parsed `ApiError` attached under `apiError`)
 * or a raw object already shaped like the 400 body. Returns the first message
 * for the field, or null when the failure carries no field-level map (the
 * caller then shows the sanitized toast instead).
 */
export function getFieldError(error: unknown, field: string): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const err = error as { apiError?: unknown; errors?: unknown };
  // Preferred carrier: the parsed ApiError attached by the updateProfile flow
  // (AuthContext adapter). Fallback: a raw object already shaped like the
  // 400 body (e.g. a thunk payload forwarded as-is).
  const errors =
    (typeof err.apiError === 'object' && err.apiError !== null
      ? (err.apiError as { errors?: unknown }).errors
      : undefined) ?? err.errors;
  if (typeof errors !== 'object' || errors === null || Array.isArray(errors)) {
    return null;
  }
  const messages = (errors as Record<string, unknown>)[field];
  return Array.isArray(messages) &&
    messages.length > 0 &&
    typeof messages[0] === 'string'
    ? messages[0]
    : null;
}
