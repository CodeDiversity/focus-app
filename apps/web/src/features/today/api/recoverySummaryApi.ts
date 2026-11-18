import { createApi } from '@reduxjs/toolkit/query/react';
import { entityBaseQuery } from '@/shared/api/rtkBaseQuery';
import { getRecoverySummary } from '@/entities/study-plan/api/studyPlanApi';
import type { RecoverySummary } from '@/entities/study-plan/model/types';

/**
 * EP16B (D-B5; formerly `planHealthApi`, EP13E) — the recovery-summary read
 * (`GET /study-plans/recovery-summary`). Today's plan note is its only reader
 * (the plan-health view was retired by EP16C).
 *
 * A caching decorator over the entity client (D12C-1): the URL and payload
 * type stay owned by `entities/study-plan`.
 *
 * `keepUnusedDataFor: 60` mirrors `todayPlanApi`: the payload describes a
 * server-derived "today" (the rolled-forward window is the last 7 days
 * relative to the profile zone), so the entry must not outlive the day it
 * describes. The endpoint takes no arguments — the client performs no date
 * arithmetic (D05-6).
 */
export const recoverySummaryApi = createApi({
  reducerPath: 'recoverySummaryApi',
  baseQuery: entityBaseQuery<void, RecoverySummary>(getRecoverySummary),
  keepUnusedDataFor: 60,
  endpoints: (builder) => ({
    recoverySummary: builder.query<RecoverySummary, void>({
      query: () => undefined,
    }),
  }),
});

export const { useRecoverySummaryQuery } = recoverySummaryApi;
