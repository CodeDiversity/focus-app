# SP-108E checkpoint — restore the boot-session loading gate

**Story:** [SP-108E](../../SP-108E-boot-loading-gate-fix.md) (fix pass, review IR-001)
**Owner:** `implementer` (single writer), sequential across E → F → G
**Started:** 2026-10-17
**Scope:** one production line (`authSlice.ts` initial `isLoading`), one new
guard-regression test file, one edited slice-default test case, artifact
records. No `services/` change, no route-component markup change, no SP-105G
generation-logic change.

## Resumed state (reconciled before editing)

- `HEAD` = `0a6ffad` ("docs(SP-108G): fix ticket …"). Working tree carried only
  other contributors' files: `docs/stories/EP01/SP-105/README.md`,
  `docs/stories/EP01/SP-105/artifacts/SP-105/review.md` (modified) and
  `docs/stories/SP-108/artifacts/SP-108/review.md` (untracked, reviewer-owned).
  All left untouched.
- Gate baseline re-run before any edit: `pnpm --filter @studypilot/web test` →
  **Test Files 15 passed (15), Tests 166 passed (166)**. Matches the review's
  recorded baseline, so no prior partial work exists for E.
- Code re-verified against the ticket's "Verified gaps":
  - `apps/web/src/store/authSlice.ts:14-19` — `initialState.isLoading: false` ✔
  - `apps/web/src/context/AuthContext.tsx:175-206` — boot effect dispatches only
    `setLoading(false)` in `finally` (`:195`) ✔
  - `apps/web/src/components/ProtectedRoute.tsx:8-19` /
    `PublicRoute.tsx:7-18` — both branch on `isLoading` first ✔
  - No test references either guard (grep) ✔

## Plan (TDD)

1. Red: add `apps/web/src/context/ProtectedRoute.test.tsx` with the real
   `ProtectedRoute`/`PublicRoute` under `Providers` + `AuthProvider`, boot
   refresh held pending; confirm the redirect/spinner assertions fail against
   current code.
2. Green: `authSlice.ts` initial `isLoading: true` (pre-migration parity).
3. Edit `authSlice.test.ts`'s "initial state has correct defaults" case
   (`isLoading: true`); note the `setLoading toggles isLoading` case asserts
   `isLoading === false` at boot and must be updated coherently.
4. Full gate: `test`, `typecheck`, `lint`.
5. Record `implementation.md`, update the queue and hand off to SP-108F.

## Notes / decisions

- Initialising the slice (not dispatching `setLoading(true)` in the effect) is
  the ticket's decided fix: StrictMode-safe and matches the pre-migration
  `useState<boolean>(true)`.
- `Dashboard.tsx:6-8` keeps its own gate untouched, as the ticket requires.

## Progress log

1. **Baseline** — 15 files / 166 tests green; code gaps re-verified (see above).
2. **Red** — added `apps/web/src/context/ProtectedRoute.test.tsx` (4 cases) and
   ran it against the unfixed code: **4 failed / 4** (premature `/login`
   redirect, no spinner, lost `/profile` `state.from`, `PublicRoute` rendering
   the login form during restore) — IR-001 reproduced.
3. **Green** — `authSlice.ts` initial `isLoading: true` (+ contract comment).
   Guard suite 4/4 green.
4. **Coherence edits** — `authSlice.test.ts`: "initial state has correct defaults"
   asserts `true`; "setLoading toggles isLoading" now starts from the real boot
   value and toggles both ways. No other suite needed changes.
5. **Gate** — `test` **16 files / 170 tests passed**, `typecheck` clean,
   `lint` clean.
6. **Commit** — `b3533a8` (code only).
7. **Record** — `artifacts/SP-108E/implementation.md` written.

## Status

Implementation complete — awaiting the combined SP-108 parent review. Nothing
self-approved; IR-001 is closed by the reviewer only, in the re-run combined
review after SP-108F and SP-108G. Next: **SP-108F** (same writer, edits a
different test file than E did but shares `store/` conventions).