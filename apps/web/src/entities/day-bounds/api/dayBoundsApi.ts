import api from '@/shared/api/httpClient';
import type { DayBound, DayBoundsResult } from '../model/types';

/**
 * Day-bounds API (EP15F over EP15B): `GET /schedule/day-bounds` and
 * `PUT /schedule/day-bounds` (replace all seven, D-B4). Plain axios per
 * D404-10; the token interceptor handles auth.
 */
export type { DayBound, DayBoundsResult } from '../model/types';

/** 200 → `{ configured, days[7] }`, defaults filled when unconfigured. */
export async function getDayBounds(): Promise<DayBoundsResult> {
  const response = await api.get<DayBoundsResult>('/schedule/day-bounds');
  return response.data;
}

/**
 * Replaces all seven bounds in one transaction.
 * 200 → the stored set with `configured: true`.
 * 400 → field-level errors keyed `days` or `days[<i>].wakeTime` / `.sleepTime`.
 */
export async function putDayBounds(days: DayBound[]): Promise<DayBoundsResult> {
  const response = await api.put<DayBoundsResult>('/schedule/day-bounds', { days });
  return response.data;
}
