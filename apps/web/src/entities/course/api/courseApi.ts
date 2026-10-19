import api from '@/shared/api/httpClient';
import type { Course } from '@/shared/types/academic';

/**
 * Course API (SP-107E; the shared API contract in
 * `docs/stories/EP01/SP-107/README.md`, implemented by SP-107B).
 *
 * `POST /courses` — create a course owned by the authenticated student (the
 * route is self-scoped via the JWT principal; there is no id in the request).
 * **Onboarding-minimal:** EP02 extends this module (list/get/update/delete,
 * archiving, meetings, views) and must not create duplicate endpoints
 * (D107-9) — this folder is the entity's home.
 */

/** `POST /courses` body (the shared API contract). */
export interface CreateCourseRequest {
  /** Non-empty after trim, ≤ 20 characters. */
  code: string;
  /** Non-empty after trim, ≤ 100 characters. */
  name: string;
  /**
   * The semester to attach the course to (the onboarding semester from the
   * onboarding state, D107-8). **Omitted from the request body when null**
   * (the course is then created without a semester — schema-nullable); the
   * backend 404s (uniform `Resource not found`) a semesterId that is missing
   * or owned by another student.
   */
  semesterId?: string | null;
}

/**
 * Creates a course for the authenticated student.
 *
 * 201 → the created `Course` (matches the existing `Course` type exactly —
 * the contract's fixed shape; `semesterId` is not part of the response).
 * 400 → field-level validation errors (`errors` map on the 400 body).
 * 404 → `semesterId` provided but missing or owned by another student
 *       (uniform `Resource not found`).
 * 409 → duplicate code for this student.
 * 401 → unauthenticated (global guard; the shared interceptor handles the
 * single-flight refresh and session-expiry path).
 */
export async function createCourse(data: CreateCourseRequest): Promise<Course> {
  // `semesterId` is omitted (not sent as null) when unset: the backend treats
  // an absent field as "no semester" and applies the schema default.
  const body: { code: string; name: string; semesterId?: string } = {
    code: data.code,
    name: data.name,
  };
  if (data.semesterId) {
    body.semesterId = data.semesterId;
  }
  const response = await api.post<Course>('/courses', body);
  return response.data;
}
