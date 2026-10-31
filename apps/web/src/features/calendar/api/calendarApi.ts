import { createApi } from '@reduxjs/toolkit/query/react';
import { entityBaseQuery } from '@/shared/api/rtkBaseQuery';
import { listCalendarEvents } from '@/entities/calendar/api/calendarApi';
import type {
  CalendarEventsResult,
  ListCalendarEventsParams,
} from '@/entities/calendar/api/calendarApi';

/**
 * EP05A — the dashboard's calendar read (D05-1: one RTK Query API per domain;
 * D05-8: the slice lives under `features/`).
 *
 * After EP12C (D12C-1) the URL, params and payload type are owned by the
 * entity module `entities/calendar/api/calendarApi.ts` (`listCalendarEvents`);
 * this slice is a caching decorator over it and no longer re-states the
 * `GET /calendar/events` contract. D404-10/D05-8 remain in force for every
 * other domain.
 *
 * The request carries **only** `from` and `to` — the two parameters the
 * endpoint's DTO whitelists — and the payload (`{ timeZone, today, from, to,
 * events }`) is returned unchanged.
 *
 * The server owns every date/time-zone computation (D05-6): `today` is the
 * student's profile-zone civil date and each event's `date` is bucketed in
 * that zone. The client only sends a civil date range and selects by the
 * server-echoed `today`.
 */
export const calendarApi = createApi({
  reducerPath: 'calendarApi',
  baseQuery: entityBaseQuery<ListCalendarEventsParams, CalendarEventsResult>(listCalendarEvents),
  // Explicit: the payload embeds the server's "today", so the cache entry is
  // dropped quickly rather than outliving the day it describes.
  keepUnusedDataFor: 60,
  endpoints: (builder) => ({
    calendarEvents: builder.query<CalendarEventsResult, ListCalendarEventsParams>({
      // Arg-passthrough: the helper forwards the arg to the entity client.
      query: (arg) => arg,
    }),
  }),
});

export const { useCalendarEventsQuery } = calendarApi;
