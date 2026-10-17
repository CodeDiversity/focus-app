# SP-108B Checkpoint 1 — AuthSlice + Thunks

**Story:** SP-108B (Auth/session state into an RTK authSlice)
**Date:** 2026-10-16
**Checkpoint:** CP1 (Slice + Thunks + Tests)

## Acceptance criteria status

| # | Criterion | Status |
|---|---|---|
| 1 | State ownership — auth fields in RTK `authSlice` | ✅ Done — `AuthState` interface with `user`, `isLoading`, `error`, `isVerificationBannerDismissed` |
| 2 | Adapter interface preservation (partial) | ⏳ CP2 — AuthContext adapter re-implementation |
| 3 | SP-105G semantics preserved (partial) | ⏳ CP2 — effects wired to dispatch slice actions |
| 4 | Thunk error/loading paths | ✅ Done — `login`/`updateProfile` async thunks + `registerThunk`/`logoutThunk` plain async dispatch |

## Verification evidence

- **Tests:** `pnpm --filter @studypilot/web test -- src/store/authSlice.test.ts` — 8 tests, all green.
  - Reducer actions: `setUser` (id-change resets banner, same-id preserves), `clearUser`, `setLoading`, `setError`/`clearError`, initial state defaults.
  - No thunk tests yet (service imports create circular deps; integration tests in CP2 cover these).

## Files changed

| File | Action |
|---|---|
| `apps/web/src/store/authSlice.ts` | **New** — pure slice (state interface, 5 reducer actions, no service imports) |
| `apps/web/src/store/authSlice.thunks.ts` | **New** — async thunks (`login`, `updateProfile`) + plain async dispatch (`registerThunk`, `logoutThunk`) |
| `apps/web/src/store/authSlice.test.ts` | **New** — 8 reducer action tests |
| `apps/web/src/store/store.ts` | **Modified** — added `auth: authSlice` to `configureStore` reducer |

## Notes

- Slice is **pure** (no service imports) to avoid circular dependency with `store.ts`.
- Thunks are in a separate file (`authSlice.thunks.ts`) that imports services.
- All 4 AC partially or fully met. CP2 will wire `AuthProvider` over the store.
