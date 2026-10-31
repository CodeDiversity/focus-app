import { createApi } from '@reduxjs/toolkit/query/react';
import { entityBaseQuery } from '@/shared/api/rtkBaseQuery';
import { listAssignments } from '@/entities/assignment/api/assignmentApi';
import type { AssignmentListItem } from '@/shared/types/academic';

/**
 * EP05A — the dashboard's assignments read (D05-1: one RTK Query API per
 * domain; D05-8: the slice lives under `features/`).
 *
 * After EP12C (D12C-1) the URL, params and payload type are owned by the
 * entity module `entities/assignment/api/assignmentApi.ts` (`listAssignments`);
 * this slice is a caching decorator over it and no longer re-states the
 * `GET /assignments` contract. D404-10/D05-8 remain in force for every other
 * domain.
 *
 * The request is the existing `GET /assignments` with **no query parameters**
 * — the backend's default sort and order apply, and the payload is returned
 * unchanged (no `transformResponse`). The endpoint has no pagination, so the
 * dashboard receives the whole list and slices it client-side (D05-3).
 */
export const assignmentsApi = createApi({
  reducerPath: 'assignmentsApi',
  baseQuery: entityBaseQuery<void, AssignmentListItem[]>(() => listAssignments()),
  // Explicit: the dashboard's "today" is the server's, so a short retention
  // keeps a stale list from outliving the page it was fetched for.
  keepUnusedDataFor: 60,
  endpoints: (builder) => ({
    assignments: builder.query<AssignmentListItem[], void>({
      // Void arg: the entity client ignores its arg and applies its own defaults.
      query: () => undefined,
    }),
  }),
});

export const { useAssignmentsQuery } = assignmentsApi;
