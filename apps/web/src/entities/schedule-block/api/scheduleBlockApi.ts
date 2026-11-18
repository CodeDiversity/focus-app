import api from '@/shared/api/httpClient';
import type {
  CreateScheduleBlockRequest,
  ScheduleBlock,
  UpdateScheduleBlockRequest,
} from '../model/types';

/**
 * Schedule-block API (EP15G over EP15B; contracts § API). Plain axios on the
 * shared `httpClient` (D404-10); the token interceptor handles auth. Every
 * route is scoped to the authenticated student by the server — a missing or
 * foreign id is the uniform 404 `Resource not found`.
 */
export type {
  CreateScheduleBlockRequest,
  ScheduleBlock,
  UpdateScheduleBlockRequest,
} from '../model/types';

/** 200 → the student's blocks ordered `startDate`, `startTime`, `id`. */
export async function listScheduleBlocks(): Promise<ScheduleBlock[]> {
  const response = await api.get<ScheduleBlock[]>('/schedule/blocks');
  return response.data;
}

/**
 * 201 → the created block. 400 → field-level `errors` map; 404 → uniform
 * (a `courseId` that is not the student's course).
 */
export async function createScheduleBlock(
  body: CreateScheduleBlockRequest
): Promise<ScheduleBlock> {
  const response = await api.post<ScheduleBlock>('/schedule/blocks', body);
  return response.data;
}

/**
 * 200 → the block that now holds the chosen date (the original row, or the
 * successor when `effectiveFrom` split the series). 400 → field-level or
 * `effectiveFrom` rule; 404 → uniform.
 */
export async function updateScheduleBlock(
  id: string,
  body: UpdateScheduleBlockRequest
): Promise<ScheduleBlock> {
  const response = await api.patch<ScheduleBlock>(`/schedule/blocks/${id}`, body);
  return response.data;
}

/**
 * 204. Without `from` the whole block goes; with `from` a weekly block ends
 * the day before it (`from` ≤ `startDate` deletes the row).
 */
export async function deleteScheduleBlock(
  id: string,
  options: { from?: string } = {}
): Promise<void> {
  await api.delete(
    `/schedule/blocks/${id}`,
    options.from ? { params: { from: options.from } } : undefined
  );
}

/** 204 (idempotent) — cancels one occurrence of a weekly block; on a one-off whose date matches, deletes it. */
export async function cancelOccurrence(id: string, date: string): Promise<void> {
  await api.delete(`/schedule/blocks/${id}/occurrences/${date}`);
}

/**
 * PUT /schedule/blocks/:id/occurrences/:date — restore one cancelled
 * occurrence (EP15K D-K2, the inverse of `cancelOccurrence`; idempotent).
 */
export async function restoreOccurrence(id: string, date: string): Promise<void> {
  await api.put(`/schedule/blocks/${id}/occurrences/${date}`);
}
