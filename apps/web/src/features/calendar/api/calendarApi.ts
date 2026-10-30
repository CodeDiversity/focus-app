import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/shared/api/rtkBaseQuery';
import type { CalendarEventsResult } from '@/entities/calendar/model/types';

/**
 * EP05A — the dashboard's calendar read (D05-1: one RTK Query API per domain;
 * D05-8: the slice lives under `features/`).
 *
 * The request is the existing `GET /calendar/events` carrying **only** `from`
 * and `to` — the two parameters the endpoint's DTO whitelists — and the
 * payload (`{ timeZone, today, from, to, events }`) is returned unchanged.
 *
 * The server owns every date/time-zone computation (D05-6): `today` is the
 * student's profile-zone civil date and each event's `date` is bucketed in
 * that zone. The client only sends a civil date range and selects by the
 * server-echoed `today`.
 */
export const calendarApi = createApi({
  reducerPath: 'calendarApi',
  baseQuery: axiosBaseQuery,
  // Explicit: the payload embeds the server's "today", so the cache entry is
  // dropped quickly rather than outliving the day it describes.
  keepUnusedDataFor: 60,
  endpoints: (builder) => ({
    calendarEvents: builder.query<CalendarEventsResult, { from: string; to: string }>({
      query: ({ from, to }) => ({
        url: '/calendar/events',
        method: 'GET',
        params: { from, to },
      }),
    }),
  }),
});

export const { useCalendarEventsQuery } = calendarApi;
