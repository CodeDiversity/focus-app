import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createAppStore } from '@/app/store/createAppStore';

/**
 * EP16G: the test store is the app store — same reducers, same middleware,
 * same logout/account-switch reset — built fresh per test.
 */
export function makeTestStore() {
  return createAppStore();
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
