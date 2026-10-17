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
| `apps/web/src/store/authSlice.thunks.test.ts` | Added by [SP-108F](../SP-108F/checkpoint.md) — 4 thunk error/loading phase tests (`login` pending/rejection, `updateProfile` success/rejection) through the real `login`/`updateProfile` thunks |
| `apps/web/src/context/AuthContext.registerLogout.test.tsx` | Added by [SP-108F](../SP-108F/checkpoint.md) — 4 adapter-callback tests for the real `register` and `logout` paths (sanitized error + rethrow, no user on success, always-clear-token) |
| `apps/web/src/context/AuthContext.test.tsx` | Modified — wrap in Redux Provider (test setup change only; all 14 existing cases pass unchanged) |

## Acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | State ownership — every auth/session field in RTK `authSlice` | ✅ Done |
| 2 | Adapter interface preservation (12 members) | ✅ Done — `AuthContextType` unchanged, all consumers work |
| 3 | SP-105G semantics preserved exactly | ✅ Done — sessionVersion, profileFlight, restoreFlight, boot restore, session-expired handler, registerLocalSessionClearer, focus-driven refresh all wired to slice dispatch |
| 4 | Thunk error/loading paths | ✅ Done — login/updateProfile thunks surface sanitized errors; register/logout dispatch slice actions inline. **Negative cases tested: added 2026-10-17 by [SP-108F](../SP-108F/implementation.md)** (review IR-002) — `authSlice.thunks.test.ts` (4) + `AuthContext.registerLogout.test.tsx` (4) |

## Test evidence

- **AuthContext:** 14/14 tests pass (session restore, expired navigation, logout clearing, focus-driven profile refresh, profile flight dedup, stale completion rejection, recovery session generation)
- **Slice:** 8/8 tests pass (reducer actions + initial state; the boot `isLoading` default was corrected to `true` by [SP-108E](../SP-108E/implementation.md))
- **Thunks (SP-108F, review IR-002):** 4/4 in `authSlice.thunks.test.ts` — `login` pending raises `isLoading` and clears a stale error; `login` rejection stores the sanitized `getErrorMessage` string as the `rejectWithValue` payload and clears loading in the `finally`; `updateProfile` success sets the user; `updateProfile` rejection stores the sanitized message, clears loading and keeps the signed-in account.
- **Adapter callbacks (SP-108F, review IR-002):** 4/4 in `AuthContext.registerLogout.test.tsx` — `register` rejection stores the sanitized message and rethrows to the caller with no user set; `register` success does not authenticate and clears loading; `logout` clears the token and the slice user both when the service resolves and when it rejects (always-clear-token guarantee).
- **TR-108-02:** owned by these 8 thunk/adapter cases plus the 8 slice reducer cases and the 14 `AuthContext` cases — see `artifacts/SP-108/implementation.md`.
- **Whole web suite after SP-108F:** 18 files / 178 tests pass; typecheck clean; lint clean.
- **Typecheck:** Clean
- **Lint:** Clean

## Out of scope

- 82 tests fail because they import `App` which now has `AuthProvider` requiring Redux Provider. These will be fixed by SP-108C (RTK Query migration updates test wrappers).
- No backend changes.
- No TanStack Query removal (SP-108C/D).
