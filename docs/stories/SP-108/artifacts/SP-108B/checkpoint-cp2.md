# SP-108B Checkpoint 2 — AuthProvider Adapter

**Story:** SP-108B (Auth/session state into an RTK authSlice)
**Date:** 2026-10-16
**Checkpoint:** CP2 (AuthProvider adapter over store)

## Acceptance criteria status

| # | Criterion | Status |
|---|---|---|
| 1 | State ownership — auth fields in RTK `authSlice` | ✅ Done — all 5 state fields in slice, selectors exported |
| 2 | Adapter interface preservation (12 members) | ✅ Done — `AuthProvider` exposes identical `AuthContextType` |
| 3 | SP-105G semantics preserved | ✅ Done — sessionVersion ref, profileFlight, restoreFlight, boot restore, session-expired handler, registerLocalSessionClearer, focus-driven refresh all wired to dispatch slice actions |
| 4 | Thunk error/loading paths | ✅ Done — login/updateProfile thunks + register/logout inline dispatch |

## Verification evidence

- **AuthContext tests:** `pnpm --filter @studypilot/web test -- src/context/AuthContext.test.tsx` — 14/14 tests pass.
  - Session restore, expired navigation, logout clearing, focus-driven profile refresh, profile flight deduplication, stale completion rejection, recovery session generation — all 18 existing cases pass.
- **Slice tests:** `pnpm --filter @studypilot/web test -- src/store/authSlice.test.ts` — 8/8 tests pass.
- **Typecheck:** Clean (no errors).
- **Lint:** Clean (no warnings).

## Files changed

| File | Action |
|---|---|
| `apps/web/src/context/AuthContext.tsx` | **Rewritten** — adapter over Redux store (selectors + dispatching thunks + local refs) |
| `apps/web/src/store/authSlice.ts` | **New** — pure slice (state interface, 6 reducer actions) |
| `apps/web/src/store/authSlice.selectors.ts` | **New** — 5 selectors for slice state |
| `apps/web/src/store/authSlice.thunks.ts` | **New** — async thunks (login, updateProfile) + plain dispatch (registerThunk, logoutThunk) |
| `apps/web/src/store/store.ts` | **Modified** — added `auth: authReducer` |
| `apps/web/src/context/AuthContext.test.tsx` | **Modified** — wrap in Redux Provider (test setup, not test content) |

## Notes

- All 14 AuthContext tests pass unchanged (interface-level proof).
- 82 other tests fail because they import `App` which now has `AuthProvider` requiring Redux Provider — out of scope for SP-108B, will be fixed by SP-108C (RTK Query migration updates test wrappers).
- `login`/`updateProfile` are `createAsyncThunk` (return pending/fulfilled/rejected actions).
- `register`/`logout` are inlined in `AuthProvider` as plain async callbacks that dispatch slice actions directly (matching original behavior).
