import { createApi } from '@reduxjs/toolkit/query/react';
import { entityBaseQuery } from '@/shared/api/rtkBaseQuery';
import { getMomentum } from '@/entities/study-session/api/studySessionApi';
import type { MomentumSummary } from '@/entities/study-session/model/types';

/**
 * EP13K (D-K11) — the momentum read, shared by the dashboard card and the
 * focus page's celebration (one cache). A caching decorator over the entity
 * client; `keepUnusedDataFor: 60` because the payload embeds the server's
 * "today" (the `todayPlanApi` precedent).
 */
export const momentumApi = createApi({
  reducerPath: 'momentumApi',
  baseQuery: entityBaseQuery<void, MomentumSummary>(getMomentum),
  keepUnusedDataFor: 60,
  endpoints: (builder) => ({
    momentum: builder.query<MomentumSummary, void>({
      query: () => undefined,
    }),
  }),
});

export const { useMomentumQuery, useLazyMomentumQuery } = momentumApi;
