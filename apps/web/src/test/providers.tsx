import type { ReactNode } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import authReducer from '@/features/session/model/authSlice';
import onboardingReducer from '@/features/onboarding/model/onboardingSlice';
import { api } from '@/features/session/api/sessionApi';
import { assignmentsApi } from '@/features/assignments/api/assignmentsApi';
import { calendarApi } from '@/features/calendar/api/calendarApi';

/**
 * A fresh store per test, mirroring `src/app/store/store.ts` (auth + onboarding
 * + api + assignmentsApi + calendarApi reducers and their middlewares) so
 * tests never share mutable session, onboarding or RTK Query cache state.
 */
export function makeTestStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      onboarding: onboardingReducer,
      [api.reducerPath]: api.reducer,
      [assignmentsApi.reducerPath]: assignmentsApi.reducer,
      [calendarApi.reducerPath]: calendarApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [api.reducerPath, assignmentsApi.reducerPath, calendarApi.reducerPath],
        },
      }).concat(api.middleware, assignmentsApi.middleware, calendarApi.middleware),
  });
}

interface ProvidersProps {
  children: ReactNode;
  store?: ReturnType<typeof makeTestStore>;
  /** When given, children are wrapped in a MemoryRouter seeded with these entries. */
  initialEntries?: string[];
}

/** Redux `Provider` with an optional `MemoryRouter` for route-aware tests. */
export function Providers({ children, store = makeTestStore(), initialEntries }: ProvidersProps) {
  const content = <Provider store={store}>{children}</Provider>;
  return initialEntries ? (
    <MemoryRouter initialEntries={initialEntries}>{content}</MemoryRouter>
  ) : (
    content
  );
}
