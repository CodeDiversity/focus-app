import api from '@/shared/api/httpClient';
import type { AvailabilitySlot } from '@/entities/availability/model/types';

/**
 * Availability API (SP-128B; the shared API contract in
 * [docs/stories/EP04/README.md](../../../../../docs/stories/EP04/README.md),
 * implemented by SP-128A). Routes: `GET /availability-slots` (the student's
 * list, ordered `dayOfWeek` asc then `startTime` asc),
 * `POST /availability-slots`, `PATCH /availability-slots/:id` (partial merge),
 * `DELETE /availability-slots/:id`. Availability belongs to the student, not
 * to a course — a top-level resource per D404-11.
 *
 * No RTK Query: the entity uses the plain-axios pattern established by
 * SP-107E/SP-110B (`httpClient` + token interceptor), D404-10.
 */
export { type AvailabilitySlot } from '@/entities/availability/model/types';

/**
 * `POST /availability-slots` body (the shared API contract): `dayOfWeek`
 * integer 0–6, `HH:mm` times with `endTime` strictly after `startTime`
 * (no midnight wrap); the frontend form mirrors the rules (DoD 2).
 * `isAvailable` is the kind: `true` available window, `false` blocked time.
 */
export interface CreateAvailabilitySlotRequest {
  /** 0–6, Sunday=0 … Saturday=6 (D112-1). */
  dayOfWeek: number;
  /** 24-hour `HH:mm`. */
  startTime: string;
  /** 24-hour `HH:mm`; strictly after `startTime` (same day). */
  endTime: string;
  /** Omitted → the API default `true` (an available window). */
  isAvailable?: boolean;
}

/**
 * `PATCH /availability-slots/:id` body (the shared API contract): partial
 * merge — at least one field; the backend validates the **merged** values.
 */
export interface UpdateAvailabilitySlotRequest {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  isAvailable?: boolean;
}

/**
 * Lists the authenticated student's availability slots (SP-128A contract).
 *
 * 200 → `AvailabilitySlot[]` ordered by `dayOfWeek` asc, then `startTime` asc
 * (the caller renders the API order as-is — presentation grouping only).
 * 401 → unauthenticated (global guard; the shared interceptor handles the
 * single-flight refresh and session-expiry path).
 */
export async function listAvailabilitySlots(): Promise<AvailabilitySlot[]> {
  const response = await api.get<AvailabilitySlot[]>('/availability-slots');
  return response.data;
}

/**
 * Creates a recurring slot for the authenticated student.
 *
 * 201 → the created `AvailabilitySlot` (the canonical 7-key shape —
 * `userId` is never exposed).
 * 400 → field-level validation errors (`errors` map on the 400 body:
 * `dayOfWeek` / `startTime` / `endTime`).
 * 409 → a slot with the same `userId` + `dayOfWeek` + `startTime` already
 * exists (`@@unique([userId, dayOfWeek, startTime])`) — the message says the
 * slot "already exists".
 * 401 → unauthenticated (global guard).
 */
export async function createAvailabilitySlot(
  data: CreateAvailabilitySlotRequest
): Promise<AvailabilitySlot> {
  const response = await api.post<AvailabilitySlot>('/availability-slots', data);
  return response.data;
}

/**
 * Updates one of the student's slots (SP-128A contract): partial merge of
 * `{ dayOfWeek?, startTime?, endTime?, isAvailable? }` — the slot must belong
 * to the requesting student (missing or foreign → uniform 404, no write);
 * validation runs on the merged values.
 *
 * 200 → the updated `AvailabilitySlot`.
 * 400 → field-level validation errors (merged values; or an empty body).
 * 404 → uniform `Resource not found` — the slot is missing or owned by
 * another student (no existence oracle).
 * 409 → the merged `(dayOfWeek, startTime)` collides with a different slot.
 * 401 → unauthenticated (global guard).
 */
export async function updateAvailabilitySlot(
  id: string,
  data: UpdateAvailabilitySlotRequest
): Promise<AvailabilitySlot> {
  const response = await api.patch<AvailabilitySlot>(`/availability-slots/${id}`, data);
  return response.data;
}

/**
 * Deletes one of the student's slots (SP-128A contract).
 *
 * 204 → deleted (no body).
 * 404 → uniform `Resource not found` (missing / foreign / malformed id).
 * 401 → unauthenticated (global guard).
 */
export async function deleteAvailabilitySlot(id: string): Promise<void> {
  await api.delete(`/availability-slots/${id}`);
}
