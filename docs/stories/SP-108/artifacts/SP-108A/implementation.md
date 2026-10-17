# SP-108A Implementation Record — Redux Toolkit store foundation

**Story:** [SP-108A](../../SP-108A-store-foundation.md)
**Parent:** [SP-108](../../README.md) · **Milestone:** M1 · **Layer:** Frontend
**Implemented:** 2026-10-16 · **Record written:** 2026-10-17 by
[SP-108G](../../SP-108G-store-implementation-record.md) (review finding **IR-003**)
**State:** Implemented — awaiting the combined SP-108 parent review.

> **Provenance of this record.** SP-108A was implemented with only a
> [`checkpoint.md`](./checkpoint.md) progress record; the reviewer (IR-003) and
> the DoD auditor read `implementation.md`. This record is a **reconstruction**
> from that checkpoint, the Git history (`d164841`, plus the SP-108C commits that
> carried the initially-uncommitted store files) and the combined review's
> verified results (`artifacts/SP-108/review.md`). No test result, gate result or
> runtime check is newly claimed here: every verification line below is
> reproduced from the checkpoint or the review and marked **not re-run**.

## Summary

A laid the Redux Toolkit foundation for the web app: RTK installed in
`apps/web`, a `configureStore` store with the default middleware (serializability
and immutability checks active), typed `useAppDispatch`/`useAppSelector` hooks,
and a `<Provider store={store}>` wrapper in `main.tsx`. No feature behaviour
changed; the app-wide wiring is what later children (B: `authSlice`, C: RTK
Query) plugged into.

## Files changed

| File | Action |
|---|---|
| `apps/web/package.json` | Added `@reduxjs/toolkit` 2.13.0 and `react-redux` 9.3.0 |
| `apps/web/src/store/store.ts` | **New** — `configureStore({ reducer: {} })` with `getDefaultMiddleware()`; exports `AppStore`, `RootState`, `AppDispatch` |
| `apps/web/src/store/hooks.ts` | **New** — `useAppDispatch`, `useAppSelector` typed hooks |
| `apps/web/src/store/store.test.tsx` | **New** — 3 cases (middleware config, serializability negative, typed hooks against a `Provider`) |
| `apps/web/src/main.tsx` | Modified — imports `Provider` + `store` and wraps the app content in `<Provider store={store}>` |

(Five-file table as recorded in [`checkpoint.md`](./checkpoint.md).)

**Commit attribution — recorded for accuracy, not a finding.** A's work sat
uncommitted at the end of A. `git log --diff-filter=A` shows
`apps/web/src/store/store.ts` and `store.test.tsx` were first committed in
`7439f8f` (SP-108C CP2, which refines A's originals by registering the RTK Query
reducer/middleware and correcting two stale assertions), and A's `main.tsx`
`Provider` wiring is carried in `57a8850` (SP-108C CP4); `d164841` ("commit
SP-108A store foundation and SP-108B auth slice (previously uncommitted)")
captured the remainder — `hooks.ts`, `apps/web/package.json` and the `authSlice`
family. The review observed the same Git-scope condition as IR-005 (parent-index
polish, deferred).

## Acceptance criteria

| # | Criterion | Status | Evidence |
|---|---|---|---|
| A1 | `@reduxjs/toolkit` and `react-redux` installed in `apps/web` | ✅ Done — RTK 2.13.0, react-redux 9.3.0 | `apps/web/package.json` (checkpoint); independently confirmed by the combined review (`review.md` §SP-108A A1, cited `package.json:19,29`) |
| A2 | `src/store/store.ts` with `configureStore` + `getDefaultMiddleware()` | ✅ Done — empty-reducer placeholder at the time; serializability + immutability active | `store.ts:5-16` (review A2). The placeholder was replaced by B's `auth` reducer and C's `api` reducer — that later state is C's work, recorded in the parent index |
| A3 | `src/store/hooks.ts` with `useAppDispatch`, `useAppSelector`, `RootState`, `AppDispatch` | ✅ Done with a recorded deviation — see below | `hooks.ts:1-6` (review A3, result **PARTIAL** on the type-export placement only) |
| A4 | `main.tsx` wraps `App` in `<Provider store={store}>`; the app behaves as before | ✅ Wiring confirmed; the "behaves as before" clause was **FAIL at review time** and is addressed by SP-108E | `main.tsx:11-19` (`StrictMode > BrowserRouter > Provider > AuthProvider > App`; the TanStack providers were removed later by C). Review A4 FAIL came from IR-001 (the boot `isLoading` initial value introduced by B), fixed in `b3533a8` by SP-108E and pinned by `apps/web/src/context/ProtectedRoute.test.tsx` — see [`../SP-108E/implementation.md`](../SP-108E/implementation.md). Not re-verified here |

## Tests delivered

`apps/web/src/store/store.test.tsx` — 3 cases (TR-108-01):

1. the store is created and the default middleware chain is active (a no-op action
   dispatches; the registered reducer keys are observed);
2. dispatching a non-serializable payload does not throw (serializability check
   present);
3. `useAppDispatch`/`useAppSelector` render and dispatch against a `Provider`.

These were extended in place by SP-108C (CP2), which corrected two stale
assertions after the `api` reducer was registered; the current expectations are
`['api', 'auth']` and two state keys.

## Verification evidence (recorded, not re-run)

| Gate | Recorded result | Source |
|---|---|---|
| Web suite at A's completion | **12 files / 145 tests green** (142 pre-existing + 3 new store tests) | `checkpoint.md` — per checkpoint; **not re-run** |
| Typecheck | clean, no errors | `checkpoint.md` — per checkpoint; **not re-run** |
| Lint | clean, no warnings | `checkpoint.md` — per checkpoint; **not re-run** |
| Independent re-run by the reviewer | 15 files / 166 tests green, typecheck clean, lint clean — a later tree state covering A, B, C and D | `artifacts/SP-108/review.md` §Limitations |
| Whole suite after the fix pass (E → F) | 18 files / 178 tests green | `../SP-108F/implementation.md` — a later tree state, not A's own gate |

**No runtime/dev-server smoke was performed for A** (no registered test-account
credential exists in the repo, and obtaining one would require reading secret
files or writing into the user's local dev database). Recorded as not performed
with that reason, consistent with the parent index and SP-108D's record.

## Deviations and notes

1. **A3 type-export placement (cosmetic; review IR-008).** A3 asked for
   `RootState`/`AppDispatch` to be exported from `hooks.ts`; they are exported
   from `store.ts:19-20` and `hooks.ts` only imports them. No consumer impact —
   the typed hooks are correct. Left as-is; it is not covered by the current fix
   pass.
2. **Harmless empty-reducer warning.** At A's time the store's `reducer` object
   was empty, so RTK logged "Store does not have a valid reducer" on startup.
   Recorded as expected and harmless; B and C replaced the placeholder.
3. **TanStack providers still present.** `QueryClientProvider` and
   `ReactQueryDevtools` remained in `main.tsx` at A's completion; C/D removed
   them, as planned.
4. **All 142 pre-existing tests passed unchanged** at A's completion — recorded
   in the checkpoint; not re-run here.

## Open items

- IR-008 (the `hooks.ts` type-export deviation above) is unfixed polish,
  explicitly outside the E → F → G fix scope.
- A4's behavioural clause is claimed fixed by SP-108E; closure is the combined
  parent review's to make, not this record's.

## Out of scope

Backend, Prisma, migrations, DTOs, environment variables and academic-data
queries — A touched only the web workspace's dependency manifest and app-wide
store/provider wiring. No endpoint or transport behaviour changed.