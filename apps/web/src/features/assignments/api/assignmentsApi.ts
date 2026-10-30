import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/shared/api/rtkBaseQuery';
import type { AssignmentListItem } from '@/shared/types/academic';

/**
 * EP05A — the dashboard's assignments read (D05-1: one RTK Query API per
 * domain; D05-8: the slice lives under `features/` so it imports neither
 * another feature nor `entities/`).
 *
 * The request is the existing `GET /assignments` with **no query parameters**
 * — the backend's default sort and order apply, and the payload is returned
 * unchanged (no `transformResponse`). The endpoint has no pagination, so the
 * dashboard receives the whole list and slices it client-side (D05-3).
 */
export const assignmentsApi = createApi({
  reducerPath: 'assignmentsApi',
  baseQuery: axiosBaseQuery,
  // Explicit: the dashboard's "today" is the server's, so a short retention
  // keeps a stale list from outliving the page it was fetched for.
  keepUnusedDataFor: 60,
  endpoints: (builder) => ({
    assignments: builder.query<AssignmentListItem[], void>({
      query: () => ({
        url: '/assignments',
        method: 'GET',
      }),
    }),
  }),
});

export const { useAssignmentsQuery } = assignmentsApi;
