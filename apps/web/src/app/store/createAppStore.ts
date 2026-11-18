import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/session/model/authSlice';
import onboardingReducer from '@/features/onboarding/model/onboardingSlice';
import { api } from '@/features/session/api/sessionApi';
import { assignmentsApi } from '@/features/assignments/api/assignmentsApi';
import { calendarApi } from '@/features/calendar/api/calendarApi';
import { todayPlanApi } from '@/features/today-plan/api/todayPlanApi';
import { recoverySummaryApi } from '@/features/today/api/recoverySummaryApi';
import { momentumApi } from '@/features/momentum/api/momentumApi';
import { PER_STUDENT_APIS, resetOnUserChange } from './resetOnUserChange';

/**
 * EP16G — the one store configuration, shared by the app (`store.ts`) and by
 * the test factory (`test/providers.tsx`), so the logout/account-switch
 * reset is present wherever a store exists.
 *
 * The slices are listed explicitly (RTK infers `RootState` from literal
 * keys); `resetOnUserChange.test.ts` (EP16G-AC4) fails if a slice here is
 * missing from `PER_STUDENT_APIS`, which is what the listener resets.
 */
export function createAppStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      onboarding: onboardingReducer,
      [api.reducerPath]: api.reducer,
      [assignmentsApi.reducerPath]: assignmentsApi.reducer,
      [calendarApi.reducerPath]: calendarApi.reducer,
      [todayPlanApi.reducerPath]: todayPlanApi.reducer,
      [recoverySummaryApi.reducerPath]: recoverySummaryApi.reducer,
      [momentumApi.reducerPath]: momentumApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: PER_STUDENT_APIS.map((slice) => slice.reducerPath),
        },
      })
        // The listener runs before the next render, so a cached entry can
        // never be served between a logout and the next student's first read.
        .prepend(resetOnUserChange.middleware)
        .concat(
          api.middleware,
          assignmentsApi.middleware,
          calendarApi.middleware,
          todayPlanApi.middleware,
          recoverySummaryApi.middleware,
          momentumApi.middleware
        ),
  });
}
