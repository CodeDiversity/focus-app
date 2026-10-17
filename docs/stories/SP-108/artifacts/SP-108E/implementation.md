# SP-108E — Implementation record: restore the boot-session loading gate

**Story:** [SP-108E](../../SP-108E-boot-loading-gate-fix.md)
**Parent:** [SP-108](../../README.md) — review fix pass, closes **IR-001 (Blocker)**
**Implementer:** `implementer` (single writer), 2026-10-17
**Commit:** `b3533a8` — "fix(web): restore the boot-session loading gate and add real route-guard regression tests (SP-108E, review IR-001)"
**State:** Implementation complete — awaiting the combined SP-108 parent review.
The review finding is closed by the reviewer only; nothing here is self-approved.

## What changed

One production value and one new test file, exactly as the ticket sized.

| File | Change |
|---|---|
| `apps/web/src/store/authSlice.ts` | `initialState.isLoading: false` → `true`, with a comment tying it to the pre-migration `useState<boolean>(true)` and the SP-105G boot contract. Reducer logic untouched. |
| `apps/web/src/context/ProtectedRoute.test.tsx` | **New** — 4 cases driving the real `ProtectedRoute`/`PublicRoute` through `Providers` + `AuthProvider` with a deferred `authService.refreshToken`. |
| `apps/web/src/store/authSlice.test.ts` | "initial state has correct defaults" now asserts `isLoading: true`; "setLoading toggles isLoading" now asserts the boot value `true` and toggles `false` → `true`. |

Deliberately **not** changed: `AuthContext.tsx` (no `setLoading(true)` dispatch —
the slice initial value is the ticket's decided fix), `ProtectedRoute.tsx` /
`PublicRoute.tsx` markup, `Dashboard.tsx`'s own gate, `services/**`, and all
SP-105G generation/single-flight logic.

## Approach

The ticket fixes the approach: initialise the slice rather than dispatch
`setLoading(true)` at the top of the boot effect, because that matches the
pre-migration contract exactly and is StrictMode-safe (an effect dispatch can be
double-invoked before the first render settles). The boot effect still clears the
flag in its `finally` (`AuthContext.tsx:195`), so the state machine is unchanged
apart from the boot start value.

TDD: the guard test was written first and **failed against the unfixed code** —
all 4 cases reproduced IR-001's counterexample (premature `/login` redirect with
no spinner, `/profile` deep-link state lost, `PublicRoute` rendering the login
form during restore). After the one-line fix all 4 pass.

## Acceptance criteria

| # | Criterion | Result | Evidence |
|---|---|---|---|
| E1 | `authSlice` initialises `isLoading: true`; the slice's initial-state case asserts it | PASS | `authSlice.ts:14-21`; `authSlice.test.ts` "initial state has correct defaults" asserts `true`, and "setLoading toggles isLoading" starts from `true` |
| E2 | Pending boot refresh → spinner, location stays `/dashboard`, outlet renders after the refresh resolves; same gate for `PublicRoute` on `/login` | PASS | `ProtectedRoute.test.tsx` — `pending boot refresh shows the spinner and stays on /dashboard`, `resolved boot refresh renders the protected outlet`, `PublicRoute holds the spinner during restore and does not redirect to /dashboard` (spinner asserted as the guards' real `.animate-spin` element, not a probe) |
| E3 | Failed restore redirects to `/login` with `state.from` carrying the attempted `/profile` location | PASS | `ProtectedRoute.test.tsx` — `failed restore redirects to /login and records state.from for a /profile deep link` |
| E4 | No collateral change: SP-105G guards/`restoreFlight` untouched; full web suite, typecheck and lint green | PASS | No `AuthContext.tsx`/`services/**` line changed in `b3533a8`; `pnpm --filter @studypilot/web test` → **16 files / 170 tests passed**, `typecheck` → clean, `lint` → clean |

## Tests added (4)

| Case | What it pins |
|---|---|
| `pending boot refresh shows the spinner and stays on /dashboard` | The IR-001 regression counterexample: no `/login` navigation, the real guard's spinner present, dashboard content not rendered while the silent refresh is in flight |
| `resolved boot refresh renders the protected outlet` | Gate releases correctly: dashboard content renders, spinner gone, location still `/dashboard`, slice user set |
| `failed restore redirects to /login and records state.from for a /profile deep link` | Post-restore guard still redirects unauthenticated students and preserves the deep link |
| `PublicRoute holds the spinner during restore and does not redirect to /dashboard` | Public-guard half of the same contract, then its documented authenticated redirect |

## Gate evidence (executed 2026-10-17)

| Check | Command | Result |
|---|---|---|
| Web suite | `pnpm --filter @studypilot/web test` | **Test Files 16 passed (16), Tests 170 passed (170)** — baseline 166 + 4 new |
| Typecheck | `pnpm --filter @studypilot/web typecheck` | clean (`tsc --noEmit`, no output) |
| Lint | `pnpm --filter @studypilot/web lint` | clean (`eslint . --max-warnings 0`, no output) |

Pre-fix baseline was re-run before editing: 15 files / 166 tests, matching the
review's recorded baseline. The only two pre-existing assertions the fix moved
were the two `isLoading` boot-value cases in `authSlice.test.ts`; no other suite
needed a change (page tests already settle the boot refresh before asserting).

## Deviations

- The slice's `setLoading toggles isLoading` case (not named in the ticket) also
  asserted the boot value `false` and had to be updated coherently with the
  initial-state case. No assertion was weakened — the case now pins the real boot
  value and the toggle in both directions.
- No other deviation from the ticket's plan.

## Not in scope (unchanged, still open)

- **IR-002** (thunk error/loading tests) → SP-108F, next in the queue.
- **IR-003** (SP-108A implementation record) → SP-108G.
- **IR-004…IR-008** polish: the stale SP-108B status line and missing CP3 file,
  the parent index's incomplete Git-scope block, the dead
  `registerThunk`/`logoutThunk`/`selectIsAuthenticated` exports, the vacuous
  same-id banner case, and A's `hooks.ts` type-export deviation. Not touched here.
- DoD 10 remains the combined parent review's; this record does not sign off
  SP-108.