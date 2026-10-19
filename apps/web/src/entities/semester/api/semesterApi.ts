import api from '@/shared/api/httpClient';
import type { Semester } from '@/shared/types/academic';

/**
 * Semester API (SP-107D; the shared API contract in
 * `docs/stories/EP01/SP-107/README.md`, implemented by SP-107B).
 *
 * `POST /semesters` — create a semester owned by the authenticated student
 * (the route is self-scoped via the JWT principal; there is no id in the
 * request). **Onboarding-minimal:** EP02 extends this module (list/get/
 * update/delete, activation, views) and must not create duplicate endpoints
 * (D107-9) — this folder is the entity's home.
 *
 * Dates are `yyyy-MM-dd` calendar-date strings (D107-7): the native date
 * input's value is sent as-is — no instant/time-zone conversion on the client.
 */

/** `POST /semesters` body (the shared API contract). */
export interface CreateSemesterRequest {
  /** Non-empty after trim, ≤ 100 characters. */
  name: string;
  /** `yyyy-MM-dd` calendar date. */
  startDate: string;
  /** `yyyy-MM-dd` calendar date, strictly after `startDate`. */
  endDate: string;
}

/**
 * Creates a semester for the authenticated student.
 *
 * 201 → the created `Semester` (dates serialized `yyyy-MM-dd`; matches the
 * existing `Semester` type exactly).
 * 400 → field-level validation errors (`errors` map on the 400 body).
 * 409 → duplicate name for this student.
 * 401 → unauthenticated (global guard; the shared interceptor handles the
 * single-flight refresh and session-expiry path).
 */
export async function createSemester(data: CreateSemesterRequest): Promise<Semester> {
  const response = await api.post<Semester>('/semesters', data);
  return response.data;
}
