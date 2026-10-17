# SP-108A: Redux Toolkit store foundation

**Story ID:** SP-108A
**Epic:** Cross-cutting technical task (standalone; see [SP-108](./SP-108.md))
**Milestone:** M1
**Layer / owner:** Frontend, `implementer` (single writer)
**Status:** Implemented — awaiting parent review (2026-10-16)
**Dependencies:** None
**Jira key:** Pending creation

## Summary and bounded scope

Install Redux Toolkit and react-redux, create the configured store and typed
hooks, and wrap the app in `<Provider>` — a pure additive slice. The app's
behavior is unchanged: TanStack Query and `AuthContext` keep working exactly as
before (they are migrated by SP-108B/C and removed by SP-108D). Exclude any
slice creation (auth slice is B; RTK Query service is C), any removal of
TanStack or Context code, and any component changes.

## Source requirements

RQ-108-01 (RD1, user decision 2026-10-16); TR-108-01; shared
[DoD](../../epics/README.md#definition-of-done) items 1/8.

## Acceptance criteria

1. `@reduxjs/toolkit` and `react-redux` are installed in `apps/web`.
2. `src/store/store.ts` (new) creates a `configureStore` with
   `getDefaultMiddleware()` (serializability and immutability checks active).
3. Typed hooks (`useAppDispatch`, `useAppSelector`, exported `RootState` /
   `AppDispatch` types) exist in `src/store/hooks.ts` (new).
4. `main.tsx` wraps `App` in `<Provider store={store}>` (inside
   `BrowserRouter`; alongside the existing `QueryClientProvider`, which C/D
   remove later). The app renders and behaves exactly as before.

## Tests (future obligations)

Vitest via `pnpm --filter @studypilot/web test`:

| Area | File | Named cases |
|---|---|---|
| Store | `src/store/store.test.ts` (new) | `store configures with default middleware` (serializability/immutability checks present); `dispatching an unknown action is rejected by the serializability middleware` (negative case); `useAppDispatch/useAppSelector work against a test provider` |

TR-108-06 regression: the full existing web suite, `typecheck` and `lint` stay
green (baseline: 11 files / 142 tests per the SP-105 record).

## Technical notes

### Inspected code (2026-10-16)

- `apps/web/src/main.tsx` — `QueryClientProvider` (line 23) and
  `ReactQueryDevtools` (line 27) wrap `AuthProvider` inside
  `BrowserRouter`; `Provider` is added beside them and left in place until D.
- `apps/web/package.json` — no Redux deps today; `@tanstack/react-query` 5.17.
- No Redux usage exists anywhere in `apps/web/src` (grep-verified).

### Proposed (not verified)

- Devtools: `@reduxjs/toolkit` ships Redux DevTools extension support by
  default — enable it as-is; no separate devtools dependency needed in A.
- Store naming: `src/store/store.ts` + `src/store/hooks.ts`; the refiner may
  adjust names without changing behavior.

## Sizing

- **Outcome:** the app boots inside a typed Redux store with zero behavioral
  change.
- **Time estimate:** 45–60 min including install, wiring, focused tests, and
  the full regression run. Low uncertainty: additive-only change.
- **Files:** production — `apps/web/package.json`, `apps/web/src/main.tsx`,
  `apps/web/src/store/store.ts` (new), `apps/web/src/store/hooks.ts` (new).
  Tests — `apps/web/src/store/store.test.ts` (new).
- **Start context:** this ticket; the [SP-108 README](./README.md) decision
  register (RD1–RD5); `apps/web/src/main.tsx`, `apps/web/package.json`,
  `apps/web/vite.config.ts` (aliases).
- **Verification:** `pnpm --filter @studypilot/web test` (all green, incl. new
  store test), `pnpm --filter @studypilot/web typecheck`,
  `pnpm --filter @studypilot/web lint`; dev-server smoke: app loads, login
  page renders.
- **Dependencies / exclusions:** none. Excludes slice creation (B), RTK Query
  (C), dependency removal/docs flip (D), and all backend work (no backend
  change in SP-108).

## Definition of Done

DoD 1 (criteria pass) and 8 (store tests) apply; DoD 2/4 are satisfied by the
middleware negative case; DoD 3/5/6/7 N/A (no data access, no new UI — recorded
in the README map); DoD 9 covered by this ticket + the README; DoD 10 belongs
to the combined SP-108 final review. Evidence goes to
`./artifacts/SP-108A/` per [delivery state](../../../.agents/delivery-state.md)
naming (`artifacts/<story-id>/` under this home).

## Out of scope

- Auth slice / `AuthProvider` adapter — [SP-108B](./SP-108B-auth-state-slice.md).
- RTK Query service and TanStack-usage replacement —
  [SP-108C](./SP-108C-rtk-query-data-layer.md).
- Dependency removal, README flip, full verification —
  [SP-108D](./SP-108D-tanstack-removal-verification.md).
