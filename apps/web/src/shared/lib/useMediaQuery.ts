import { useCallback, useSyncExternalStore } from 'react';

/** Tailwind `md` — the desktop/mobile navigation boundary (EP16E, D-E2). */
export const MD_UP_QUERY = '(min-width: 768px)';

/**
 * EP16E (D-E2) — one shared media-query hook so the header nav and the bottom
 * tab bar render conditionally from the same source (exactly one "Primary"
 * landmark at any width). `useSyncExternalStore` makes the first render
 * synchronous: there is never a flash of both navigations.
 *
 * `fallback` is returned when `matchMedia` is unavailable (jsdom without a
 * stub) — existing tests keep the desktop layout with `fallback: true`.
 */
export function useMediaQuery(query: string, fallback: boolean): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onStoreChange);
      return () => mql.removeEventListener('change', onStoreChange);
    },
    [query]
  );
  const getSnapshot = useCallback(
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : fallback),
    [query, fallback]
  );
  return useSyncExternalStore(subscribe, getSnapshot);
}
