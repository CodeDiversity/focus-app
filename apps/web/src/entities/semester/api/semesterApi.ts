import api from '@/shared/api/httpClient';
import type { Semester } from '@/shared/types/academic';

/**
 * Semester API (SP-107D; the shared API contract in
 * `docs/stories/EP01/SP-107/README.md`, implemented by SP-107B; extended by
 * SP-110A/SP-110B with the SP-110 management contract in
 * `docs/stories/EP02/SP-110/README.md`).
 *
 * `POST /semesters` — create a semester owned by the authenticated student
 * (the route is self-scoped via the JWT principal; there is no id in the
 * request). EP02 extends this module (list/get/update/delete, activation)
 * and must not create duplicate endpoints (D107-9) — this folder is the
 * entity's home.
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

/**
 * A semester with its attached course count (SP-110A contract, D110-3).
 *
 * `courseCount` = the number of courses attached to the semester, all archive
 * states (a stable definition across EP02). Returned by the list/get/update
 * routes; `POST /semesters` still returns the 7-key `Semester` (SP-107B,
 * unchanged) — a freshly created semester has no courses, so callers that
 * need the 8-key shape re-read the list after a create.
 */
export interface SemesterWithCount extends Semester {
  courseCount: number;
}

/**
 * `PATCH /semesters/:id` body (SP-110A contract, D110-5): partial merge —
 * only the fields the form changed are sent; the backend validates the
 * **merged** values. At least one field must be present (the backend 400s an
 * empty body).
 */
export interface UpdateSemesterRequest {
  /** Non-empty after trim, ≤ 100 characters. */
  name?: string;
  /** `yyyy-MM-dd` calendar date. */
  startDate?: string;
  /** `yyyy-MM-dd` calendar date, strictly after `startDate`. */
  endDate?: string;
  /**
   * Activation (D110-1): `true` deactivates all of the student's other
   * semesters and activates this one in one transaction; `false` deactivates
   * only this one.
   */
  isActive?: boolean;
}

/**
 * Lists the authenticated student's semesters (SP-110A contract).
 *
 * 200 → `SemesterWithCount[]` ordered by `startDate` desc, then `name` asc
 * (the list renders the API order as-is — no client re-sort).
 * 401 → unauthenticated (global guard; the shared interceptor handles the
 * single-flight refresh and session-expiry path).
 */
export async function listSemesters(): Promise<SemesterWithCount[]> {
  const response = await api.get<SemesterWithCount[]>('/semesters');
  return response.data;
}

/**
 * Reads one of the student's semesters (SP-110A contract).
 *
 * 200 → `SemesterWithCount`.
 * 404 → `Resource not found` — the id is missing OR owned by another student
 * (uniform; the API never reveals another student's records).
 */
export async function getSemester(id: string): Promise<SemesterWithCount> {
  const response = await api.get<SemesterWithCount>(`/semesters/${id}`);
  return response.data;
}

/**
 * Updates one of the student's semesters (SP-110A contract, D110-5).
 *
 * 200 → the updated `SemesterWithCount` (dates `yyyy-MM-dd`; `isActive`
 * reflects the single-active invariant — at most one of the student's
 * semesters is active after the request, D110-1).
 * 400 → field-level validation errors (`errors` map on the 400 body) on the
 * merged values.
 * 404 → uniform `Resource not found` (missing or foreign).
 * 409 → name collides with a different semester of the same student.
 */
export async function updateSemester(
  id: string,
  data: UpdateSemesterRequest
): Promise<SemesterWithCount> {
  const response = await api.patch<SemesterWithCount>(`/semesters/${id}`, data);
  return response.data;
}

/**
 * Deletes one of the student's semesters (SP-110A contract, D110-2).
 *
 * 204 → deleted; the semester's courses survive, explicitly set to
 * `semesterId: null` in the same transaction (they remain accessible,
 * unaffiliated).
 * 404 → uniform `Resource not found` (missing or foreign).
 */
export async function deleteSemester(id: string): Promise<void> {
  await api.delete(`/semesters/${id}`);
}
