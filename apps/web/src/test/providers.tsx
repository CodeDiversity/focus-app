import type { ReactNode } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import authReducer from '@/features/session/model/authSlice';
import onboardingReducer from '@/features/onboarding/model/onboardingSlice';
import { api } from '@/features/session/api/sessionApi';

/**
 * A fresh store per test, mirroring `src/app/store/store.ts` (auth + onboarding
 * + api reducers, api.middleware) so tests never share mutable session,
 * onboarding or RTK Query cache state.
 */
export function makeTestStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      onboarding: onboardingReducer,
      [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: { ignoredActions: [api.reducerPath] } }).concat(
        api.middleware
      ),
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
