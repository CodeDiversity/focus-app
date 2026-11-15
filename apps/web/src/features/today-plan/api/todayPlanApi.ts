import { createApi } from '@reduxjs/toolkit/query/react';
import { entityBaseQuery } from '@/shared/api/rtkBaseQuery';
import { getTodayPlan } from '@/entities/study-plan/api/studyPlanApi';
import type { TodayPlan } from '@/entities/study-plan/model/types';

/**
 * EP13D — the dashboard's today read (D05-1: one RTK Query API per domain;
 * D05-8: the slice lives under `features/`).
 *
 * A caching decorator over the entity client (`getTodayPlan`, D12C-1) — the
 * URL and payload type stay owned by `entities/study-plan`.
 *
 * `keepUnusedDataFor: 60` mirrors `calendarApi`: the payload embeds the
 * server's "today", so the cache entry must not outlive the day it describes.
 * The endpoint takes no arguments; the server derives "today" from the
 * profile zone (D05-6 — the client performs no date arithmetic).
 */
export const todayPlanApi = createApi({
  reducerPath: 'todayPlanApi',
  baseQuery: entityBaseQuery<void, TodayPlan>(getTodayPlan),
  keepUnusedDataFor: 60,
  endpoints: (builder) => ({
    todayPlan: builder.query<TodayPlan, void>({
      query: () => undefined,
    }),
  }),
});

export const { useTodayPlanQuery } = todayPlanApi;
