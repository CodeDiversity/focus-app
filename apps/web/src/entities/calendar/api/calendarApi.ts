import api from '@/shared/api/httpClient';
import type { CalendarEventsResult } from '../model/types';

/**
 * Calendar API (SP-127B) — the `GET /calendar/events` read model (SP-127A).
 *
 * Plain-axios entity client per D404-10 (no RTK Query). The server owns all
 * date/time-zone arithmetic (D404-2); the client sends only a civil date range.
 */
export type { CalendarEvent, CalendarEventsResult } from '../model/types';

export interface ListCalendarEventsParams {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

/**
 * Reads the authenticated student's calendar events for an inclusive date
 * range in their profile time zone.
 *
 * 200 → `{ timeZone, today, from, to, events }`.
 * 400 → field-level validation errors (range shape/order/span).
 * 401 → unauthenticated (global guard).
 */
export async function listCalendarEvents(
  params: ListCalendarEventsParams
): Promise<CalendarEventsResult> {
  const response = await api.get<CalendarEventsResult>('/calendar/events', {
    params: { from: params.from, to: params.to },
  });
  return response.data;
}
