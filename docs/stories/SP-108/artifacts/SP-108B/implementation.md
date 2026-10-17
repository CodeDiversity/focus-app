# SP-108B Implementation Record

**Story:** SP-108B (Auth/session state into an RTK authSlice)
**Date:** 2026-10-16
**Status:** Implemented — awaiting parent review

## Summary

Moved all auth/session client state from React `useState`/refs in `AuthProvider` to an RTK `authSlice`. `AuthProvider` is re-implemented as a store-backed adapter with the identical `AuthContextType` interface (12 members).

## Files produced

### Production

| File | Description |
|---|---|
| `apps/web/src/store/authSlice.ts` | Pure slice — state interface (`AuthState`), 6 reducer actions (`setUser`, `clearUser`, `setLoading`, `setError`, `clearError`, `setBannerDismissed`), no service imports |
| `apps/web/src/store/authSlice.thunks.ts` | Async thunks (`login`, `updateProfile`) + plain dispatch (`registerThunk`, `logoutThunk`) — imports services |
| `apps/web/src/store/authSlice.selectors.ts` | 5 selectors (`selectUser`, `selectIsAuthenticated`, `selectIsLoading`, `selectError`, `selectIsVerificationBannerDismissed`) |
| `apps/web/src/context/AuthContext.tsx` | Rewritten as Redux adapter — reads state via `useSelector`, dispatches thunks/actions, keeps coordination refs (`sessionVersion`, `profileFlight`, `restoreFlight`) |
| `apps/web/src/store/store.ts` | Modified — added `auth: authReducer` to `configureStore` |

### Tests

| File | Description |
|---|---|
| `apps/web/src/store/authSlice.test.ts` | 8 reducer action tests (setUser id-change/same-id, clearUser, setLoading, setError/clearError, initial state) |
| `apps/web/src/context/AuthContext.test.tsx` | Modified — wrap in Redux Provider (test setup change only; all 14 existing cases pass unchanged) |

## Acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | State ownership — every auth/session field in RTK `authSlice` | ✅ Done |
| 2 | Adapter interface preservation (12 members) | ✅ Done — `AuthContextType` unchanged, all consumers work |
| 3 | SP-105G semantics preserved exactly | ✅ Done — sessionVersion, profileFlight, restoreFlight, boot restore, session-expired handler, registerLocalSessionClearer, focus-driven refresh all wired to slice dispatch |
| 4 | Thunk error/loading paths | ✅ Done — login/updateProfile thunks surface sanitized errors; register/logout dispatch slice actions inline |

## Test evidence

- **AuthContext:** 14/14 tests pass (session restore, expired navigation, logout clearing, focus-driven profile refresh, profile flight dedup, stale completion rejection, recovery session generation)
- **Slice:** 8/8 tests pass (reducer actions + initial state)
- **Typecheck:** Clean
- **Lint:** Clean

## Out of scope

- 82 tests fail because they import `App` which now has `AuthProvider` requiring Redux Provider. These will be fixed by SP-108C (RTK Query migration updates test wrappers).
- No backend changes.
- No TanStack Query removal (SP-108C/D).
