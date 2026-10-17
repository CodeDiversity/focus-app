# SP-108E: Restore the boot-session loading gate on guarded routes

**Story ID:** SP-108E
**Parent:** [SP-108](./SP-108.md) (fix pass for the combined review)
**Milestone:** M1
**Layer / owner:** Frontend, `implementer` (single writer)
**Status:** Ready (fix planned) — closes review finding **IR-001 (Blocker)** in
`artifacts/SP-108/review.md`
**Dependencies:** None (fixes landed SP-108A/B code)
**Jira key:** Pending creation

## Summary and bounded scope

Restore the boot "session restoring" loading gate on route guards that SP-108B
lost: a refreshing student on a guarded route (`/dashboard`, `/profile`) is
currently redirected to `/login` while the silent `POST /auth/refresh` is still
in flight (URL bounce, login-form flash, and the deep-link `state.from`
destination lost), because `authSlice` starts `isLoading: false` and the
boot-restore effect never raises it. Fix: initialize `auth.isLoading` to `true`
(pre-migration parity with `useState<boolean>(true)`), and add a regression test
that exercises the **real** `ProtectedRoute`/`PublicRoute` guards.

Exclude: thunk phase tests (SP-108F), the SP-108A record (SP-108G), the
IR-004…IR-008 polish items, and any change to `services/`, route components'
markup, or SP-105G generation logic.

## Source requirements

RQ-108-05 ("SP-105G ... preserved **exactly**" — the boot-loading contract of
the same session-restore surface), RQ-108-06, TR-108-03; shared DoD items 1, 5,
8. Documented contract: `docs/stories/EP01/SP-102-login-logout-sessions.md:76`
("boot refresh must hold `isLoading=true` until the silent refresh settles"),
`docs/artifacts/STUDY-9/implementation.md:99-100`.

## Acceptance criteria

1. **Initial state:** `authSlice` initializes `isLoading: true` (matching the
   pre-migration `useState(true)` recorded in
   [SP-108B's mapping table](./SP-108B-auth-state-slice.md:247)); 
   `authSlice.test.ts`'s "initial state" case asserts the corrected value.
2. **No boot redirect:** a student with a live refresh cookie loading
   `/dashboard` sees the spinner while the silent refresh is pending; the
   location stays `/dashboard`; after the refresh resolves with a user the
   dashboard `Outlet` renders. Same gate behavior for `PublicRoute` on `/login`
   (spinner during restore, no premature redirect).
3. **Post-login destination preserved:** after a failed restore the guard
   redirects to `/login` with `state.from` carrying the attempted location, so a
   deep link such as `/profile` survives a fresh signed-in reload.
4. **No collateral change:** the SP-105G generation/stale-restore guards and
   `restoreFlight` dedup in the boot effect are untouched; the full web suite
   (≥166 tests), `typecheck` and `lint` stay green.

AC2/AC3 are the reviewer's closure condition for IR-001 (verified behavior, not
a claim), implemented as the tests below.

## Tests (obligations)

Vitest + jsdom, mocking `services/auth` (`authService.refreshToken`) with a
controllable deferred promise; render through `test/providers.tsx`
(`Providers` + `initialEntries`), `AuthProvider`, and the real guard
components:

| Area | File | Named cases |
|---|---|---|
| Guard regression | `apps/web/src/context/ProtectedRoute.test.tsx` (new) | `pending boot refresh shows the spinner and stays on /dashboard` (refresh promise unresolved; assert no `/login` navigation, spinner/indeterminate UI present); `resolved boot refresh renders the protected outlet`; `failed restore (or no user) redirects to /login and records state.from for a /profile deep link` |
| Public guard | same file | `PublicRoute holds the spinner during restore and does not redirect to /dashboard while authenticated-ish-race pending` |
| Slice/adapter | `apps/web/src/store/authSlice.test.ts` (edit) | `initial state has correct defaults` asserts `isLoading: true` |
| Full regression | existing suites | 166+ tests, typecheck, lint — all green |

Negative case note: the pending-refresh case is the regression counterexample
from IR-001 — it fails against the current code and must pass after the fix.

## Technical notes

### Verified gaps (2026-10-17, ground truth for the fix)

- `apps/web/src/store/authSlice.ts:14-19` — `initialState.isLoading: false`.
- `apps/web/src/context/AuthContext.tsx:175-206` — boot effect dispatches only
  `setLoading(false)` in its `finally` (:195); no raise before `refreshToken()`.
- `apps/web/src/components/ProtectedRoute.tsx:5-19` and `PublicRoute.tsx:7-18`
  — both branch on `isLoading` first; with `false` at first render they
  redirect/render-through before the refresh settles.
- Existing test coverage hole confirmed: no test file references
  `ProtectedRoute`/`PublicRoute`; `AuthContext.test.tsx` renders probes instead
  of the real guards.

### Proposed (fix decision, per the reviewer)

Initialize the slice to `true` rather than dispatching `setLoading(true)` at the
top of the boot effect: it matches the pre-migration contract exactly, is
StrictMode-safe (an effect-based dispatch can be double-invoked before the
first render settles), and keeps `Dashboard.tsx:6-8`'s own `isLoading` gate
correct without touching it. Do **not** change the `isAuthenticated` selector
semantics (`AuthContext.tsx:61-64` is the verified shape — leave it as-is; only
the `isLoading` initial value changes).

### Unverified / hand to the implementer

- Whether any other initial-render consumer behaves differently with
  `isLoading: true` for one boot tick — covered by running the full suite; if a
  public-page test renders Login eagerly, the spinner-first behavior is the
  documented pre-migration behavior and the test should seed `isLoading: false`
  explicitly instead of weakening the fix.

## Sizing

- **Outcome:** guarded routes hold the session-restoring spinner until the
  silent boot refresh settles, with a real-guard regression test proving it.
- **Time estimate:** 45–60 min: ~10 lines of production change, the guard test
  file (the main cost — wiring deferred `refreshToken` mocks through
  `AuthProvider` + router), slice-default edit, full-gate run. Low uncertainty
  once the deferred-promise mock pattern is set.
- **Files:** production — `apps/web/src/store/authSlice.ts` (1 line).
  Tests — `apps/web/src/context/ProtectedRoute.test.tsx` (new),
  `apps/web/src/store/authSlice.test.ts` (1 case edit).
- **Start context:** this ticket; review IR-001 section
  (`artifacts/SP-108/review.md:56-92`); `authSlice.ts`,
  `AuthContext.tsx:173-206` and `:61-64`, `ProtectedRoute.tsx`, `PublicRoute.tsx`,
  `test/providers.tsx`; existing mock patterns in `AuthContext.test.tsx:33-43`.
- **Verification:** `pnpm --filter @studypilot/web test` (all green, new guard
  tests passing with a genuinely pending refresh), `... typecheck`,
  `... lint`. Post-fix: `artifacts/SP-108E/` record per the sizing/handoff rule.
- **Dependencies / exclusions:** none. Excludes SP-108F/G and all polish
  findings IR-004…IR-008.

## Definition of Done

DoD 1 and 5 (boot loading state restored and verified by tests), DoD 8 (guard
regression tests), DoD 9 (record + README restatement), DoD 10 remains the
parent re-review's. Evidence goes to `./artifacts/SP-108E/`.
