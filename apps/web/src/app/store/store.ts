import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/session/model/authSlice';
import onboardingReducer from '@/features/onboarding/model/onboardingSlice';
import { api } from '@/features/session/api/sessionApi';
import { assignmentsApi } from '@/features/assignments/api/assignmentsApi';
import { calendarApi } from '@/features/calendar/api/calendarApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // SP-107C: wizard onboarding state (SP-107A endpoints)
    onboarding: onboardingReducer,
    [api.reducerPath]: api.reducer,
    // EP05A: the dashboard's two per-domain RTK Query slices (D05-1, D05-8).
    [assignmentsApi.reducerPath]: assignmentsApi.reducer,
    [calendarApi.reducerPath]: calendarApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // RTK's guidance: ignore the RTK Query action paths in the serializability
      // check — its internal cache actions are not plain serializable objects.
      serializableCheck: {
        ignoredActions: [api.reducerPath, assignmentsApi.reducerPath, calendarApi.reducerPath],
      },
    }).concat(api.middleware, assignmentsApi.middleware, calendarApi.middleware),
});

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
