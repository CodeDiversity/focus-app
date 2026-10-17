# SP-108A Checkpoint — Store Foundation

**Story:** SP-108A (Redux Toolkit store foundation)
**Date:** 2026-10-16
**State:** Implemented — awaiting parent review

## Acceptance criteria status

| # | Criterion | Status |
|---|---|---|
| 1 | `@reduxjs/toolkit` + `react-redux` installed in `apps/web` | ✅ Done — `@reduxjs/toolkit` 2.13.0, `react-redux` 9.3.0 |
| 2 | `src/store/store.ts` with `configureStore` + `getDefaultMiddleware()` | ✅ Done — empty reducer placeholder, serializability + immutability active |
| 3 | `src/store/hooks.ts` with typed hooks (`useAppDispatch`, `useAppSelector`, `RootState`, `AppDispatch`) | ✅ Done — `withTypes<>` typed hooks exported |
| 4 | `main.tsx` wraps `App` in `<Provider store={store}>` | ✅ Done — Provider wraps BrowserRouter content (inside BrowserRouter, alongside QueryClientProvider) |

## Verification evidence

- **Tests:** `pnpm --filter @studypilot/web test` — 12 files, 145 tests (142 existing + 3 new store tests) — all green.
- **Typecheck:** `pnpm --filter @studypilot/web typecheck` — clean (no errors).
- **Lint:** `pnpm --filter @studypilot/web lint` — clean (no warnings).

## Files changed

| File | Action |
|---|---|
| `apps/web/package.json` | Added `@reduxjs/toolkit` 2.13.0, `react-redux` 9.3.0 |
| `apps/web/src/store/store.ts` | **New** — `configureStore({ reducer: {} })`, exports `AppStore`, `RootState`, `AppDispatch` |
| `apps/web/src/store/hooks.ts` | **New** — `useAppDispatch`, `useAppSelector` typed hooks |
| `apps/web/src/store/store.test.tsx` | **New** — 3 test cases (middleware config, serializability negative, typed hooks) |
| `apps/web/src/main.tsx` | Modified — imports `Provider` + `store`, wraps content in `<Provider store={store}>` |

## Notes

- Store has an empty `reducer: {}` object as a placeholder — B/C will add slices.
- The `QueryClientProvider` and `ReactQueryDevtools` remain in place (C/D remove TanStack).
- All existing 142 tests pass unchanged; no behavioral regression.
- The "Store does not have a valid reducer" stderr is expected and harmless (RTK warning for empty reducer object).
