import api from '@/shared/api/httpClient';
import type { Course } from '@/shared/types/academic';

/**
 * Course API (SP-107E create; SP-111A full management surface — the shared
 * API contract in `docs/stories/EP02/SP-111/README.md`).
 *
 * Routes: `POST /courses` (create), `GET /courses` (list + `semesterId` /
 * `includeArchived` filters), `GET /courses/:id` (archive-agnostic),
 * `PATCH /courses/:id` (partial merge incl. archive/restore).  The remaining
 * EP02 extension of this module is meetings + detail projections (SP-112) —
 * no duplicate endpoints (D107-9): this folder is the entity's home.
 *
 * No RTK Query: the entity uses the plain-axios pattern established by
 * SP-107E/SP-110B (`httpClient` + token interceptor).
 */

/**
 * A course with its semester projection — the `CourseWithSemester` contract
 * shape (SP-111A, D111-4): the shared `Course` type (SP-107B 8 keys plus
 * `instructor`, D111-1) with `semesterId` and `semester: { id, name } | null`
 * (null when unaffiliated — orphaned by semester deletion, D110-2).  Returned
 * by every course route, including `POST /courses` (backward-compatible: the
 * onboarding wizard ignores the extra keys).  `createdAt`/`updatedAt` are ISO
 * timestamps.
 */
export interface CourseWithSemester extends Course {
  semesterId: string | null;
  semester: { id: string; name: string } | null;
}

/** `POST /courses` body (the shared API contract, SP-107B + SP-111A). */
export interface CreateCourseRequest {
  /** Non-empty after trim, ≤ 20 characters. */
  code: string;
  /** Non-empty after trim, ≤ 100 characters. */
  name: string;
  /**
   * The semester to attach the course to. **Omitted from the request body when
   * null** (the course is then created without a semester — schema-nullable);
   * the backend 404s (uniform `Resource not found`) a semesterId that is
   * missing or owned by another student.
   */
  semesterId?: string | null;
  /** Optional (D111-1): ≤ 100 chars, non-empty after trim; omitted when null. */
  instructor?: string | null;
  /** Optional: ≤ 2000 chars; omitted when null. */
  description?: string | null;
  /** Optional: `0 < c ≤ 30`; omitted when null. */
  credits?: number | null;
  /** Optional: `#rrggbb`; omitted when null (the schema default is indigo). */
  color?: string | null;
}

/**
 * Creates a course for the authenticated student.
 *
 * 201 → the created `CourseWithSemester` (D111-4 — the extended shape; the
 * SP-107B onboarding wizard ignores the extra keys).
 * 400 → field-level validation errors (`errors` map on the 400 body).
 * 404 → `semesterId` provided but missing or owned by another student
 *       (uniform `Resource not found`).
 * 409 → duplicate code for this student.
 * 401 → unauthenticated (global guard; the shared interceptor handles the
 * single-flight refresh and session-expiry path).
 */
export async function createCourse(data: CreateCourseRequest): Promise<CourseWithSemester> {
  // Optional fields are omitted (not sent as null) when unset: the backend
  // treats an absent field as "use the schema default" (color #6366f1,
  // credits/description/instructor NULL, no semester).
  const body: {
    code: string;
    name: string;
    semesterId?: string;
    instructor?: string;
    description?: string;
    credits?: number;
    color?: string;
  } = { code: data.code, name: data.name };
  if (data.semesterId) {
    body.semesterId = data.semesterId;
  }
  if (data.instructor) {
    body.instructor = data.instructor;
  }
  if (data.description) {
    body.description = data.description;
  }
  if (data.credits !== null && data.credits !== undefined) {
    body.credits = data.credits;
  }
  if (data.color) {
    body.color = data.color;
  }
  const response = await api.post<CourseWithSemester>('/courses', body);
  return response.data;
}

/** `GET /courses` query (the shared API contract, SP-111A). */
export interface ListCoursesParams {
  /**
   * Filter to one semester — it must be the requesting student's own
   * (missing or foreign → uniform 404).
   */
  semesterId?: string;
  /** `true` → include `isActive = false` rows; default is active only (D111-3). */
  includeArchived?: boolean;
}

/**
 * Lists the authenticated student's courses (SP-111A contract).
 *
 * 200 → `CourseWithSemester[]` ordered by `name` asc, then `code` asc (the
 * list renders the API order as-is — no client re-sort).
 * 404 → `semesterId` provided but missing or owned by another student
 *       (uniform `Resource not found`).
 * 401 → unauthenticated (global guard; the shared interceptor handles the
 * single-flight refresh and session-expiry path).
 */
export async function listCourses(params: ListCoursesParams = {}): Promise<CourseWithSemester[]> {
  const query: Record<string, string> = {};
  if (params.semesterId) {
    query.semesterId = params.semesterId;
  }
  if (params.includeArchived) {
    query.includeArchived = 'true';
  }
  const response = await api.get<CourseWithSemester[]>('/courses', { params: query });
  return response.data;
}

/**
 * Reads one of the student's courses (SP-111A contract) — **regardless of
 * archive state** (archived courses remain accessible, AC-E02-05).
 *
 * 200 → `CourseWithSemester`.
 * 404 → `Resource not found` — the id is missing OR owned by another student
 * (uniform; the API never reveals another student's records).
 * 401 → unauthenticated (global guard; the shared interceptor handles the
 * single-flight refresh and session-expiry path).
 */
export async function getCourse(id: string): Promise<CourseWithSemester> {
  const response = await api.get<CourseWithSemester>(`/courses/${id}`);
  return response.data;
}

/**
 * `PATCH /courses/:id` body (SP-111A contract): partial merge — only the
 * fields the caller changed are sent; the backend validates the **merged**
 * values.  An explicit `null` is treated as omitted (the stored value is
 * kept).  At least one field must be present (the backend 400s an empty
 * body).  `isActive: false` archives, `isActive: true` restores (D111-2).
 */
export interface UpdateCourseRequest {
  /** Non-empty after trim, ≤ 20 characters. */
  code?: string | null;
  /** Non-empty after trim, ≤ 100 characters. */
  name?: string | null;
  /** Must be the student's own semester; a miss → uniform 404, no write. */
  semesterId?: string | null;
  /** ≤ 2000 characters; an empty string clears the stored description. */
  description?: string | null;
  /** `0 < c ≤ 30`. */
  credits?: number | null;
  /** `#rrggbb`. */
  color?: string | null;
  /** ≤ 100 characters, non-empty after trim. */
  instructor?: string | null;
  /** `false` archives, `true` restores (D111-2). */
  isActive?: boolean | null;
}

/**
 * Updates one of the student's courses (SP-111A contract).
 *
 * 200 → the updated `CourseWithSemester`.
 * 400 → field-level validation errors (`errors` map on the 400 body) on the
 * merged values (or an empty body).
 * 404 → uniform `Resource not found` — course missing/foreign, OR
 * `semesterId` missing/foreign (no write in either case).
 * 409 → `code` collides with a different course of the same student.
 * 401 → unauthenticated (global guard; the shared interceptor handles the
 * single-flight refresh and session-expiry path).
 */
export async function updateCourse(
  id: string,
  data: UpdateCourseRequest
): Promise<CourseWithSemester> {
  const response = await api.patch<CourseWithSemester>(`/courses/${id}`, data);
  return response.data;
}
