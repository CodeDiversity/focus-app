# SP-108C checkpoint
Updated: 2026-10-16 22:50 +0100
Status: implementation complete — awaiting parent review
Story: docs/stories/SP-108/SP-108C-rtk-query-data-layer.md
Review unit: SP-108 parent — `docs/stories/SP-108/artifacts/SP-108/implementation.md`
Role / scope: implementer; frontend-only slice. Owned `src/store/api.ts`,
`src/store/store.ts`, `src/hooks/useResendVerification.ts`, `src/main.tsx`,
`src/test/providers.tsx` and the named test wrappers. Excluded `src/services/**`,
`@tanstack` package removal and repo-doc flips (SP-108D).

## Repository state
- Workspace / branch: /Users/michael/Documents/GitHub/focus-app (feature branch, SP-108 docs + A/B/C work)
- HEAD at last update: 57a8850 (CP4); 5cce85e (CP3), 7439f8f (CP2), 5308efa (CP1)
- Saved work: C's four commits are on the branch. SP-108A/B application code that
  was still untracked/uncommitted when C started is preserved and **not** folded
  into C's commits: `apps/web/src/store/{authSlice,authSlice.thunks,authSlice.selectors,authSlice.test,hooks}.ts`,
  `apps/web/src/context/AuthContext.test.tsx`, `apps/web/package.json`,
  `pnpm-lock.yaml` (C modified none of these except where noted).
- Other work to preserve: `docs/stories/EP01/SP-105/**` edits (another story's
  reviewer) and the refiner's edits to the SP-108{A,B,C} ticket files — untouched.

## Progress
- [x] Baseline measured: 13 files / 153 tests, 7 files / 82 tests red.
- [x] CP1 `src/store/api.ts` + `src/store/api.test.ts` — 8/8 green (commit 5308efa).
      Deviations: baseQuery maps `body` → axios `data` (axios ignores an unknown
      `body` key and would send an empty payload); the shared instance is imported
      as `httpClient` because the module also exports the RTK service as `api`.
- [x] CP2 store wiring + `src/test/providers.tsx`; Login/Register wrappers; the 2
      stale `store.test.tsx` assertions (commit 7439f8f).
- [x] CP3 `useResendVerification` migration + 5-case hook suite
      (`useResendVerification.test.tsx`; `.tsx` because the wrapper renders JSX).
      Red-first confirmed: the pre-migration hook fails with
      `No QueryClient set` (commit 5cce85e).
- [x] CP4 `src/main.tsx` swap (no `QueryClient`/`QueryClientProvider`/
      `ReactQueryDevtools`) + the four remaining wrappers; the TanStack
      mutation-cache assertion in `VerifyEmail.test.tsx` ported to the RTK Query
      mutation state so the raw-link-token invariant still holds (commit 57a8850).
- [x] AC4 proof: `git diff --stat -- apps/web/src/services` is empty.
- [x] Implementation record written: `docs/stories/SP-108/artifacts/SP-108C/implementation.md`.
- Current step: none — all four checkpoints complete.

## Decisions and dependencies
- Ticket Decisions D1–D8 were treated as authoritative; no re-derivation.
- Deviation recorded in the implementation record: the cooldown now starts after
  the awaited `trigger(...).unwrap()` resolves (RTK Query has no `onSuccess`);
  a failed send still does not start the cooldown.
- **Defect repaired outside C's nominal scope (SP-108B fallout):**
  `AuthContext.loginFn`/`updateProfileFn` dispatched their thunks without
  awaiting, so `await login()` resolved on a rejected sign-in — `LoginPage`
  toasted success and navigated to `/dashboard` on a 401. Both now re-throw the
  thunk's sanitized `payload`. AC3 makes a green web suite C's verification;
  flagged here and in the implementation record for the parent review.
- Dependencies satisfied: A and B landed. D (package removal, doc flip) remains.

## Verification
- `cd apps/web && pnpm vitest run` → **15 files / 166 tests passed, 0 failed**.
- `pnpm --filter @studypilot/web typecheck` → clean.
- `pnpm --filter @studypilot/web lint` → clean.
- `pnpm --filter @studypilot/web build` → ✓ built (1554 modules; `dist` removed).
- `grep -rn "@tanstack\|QueryClient\|useMutation" apps/web/src` → zero hits.
- Not run: the backend/api suites (no backend change) and the combined SP-108
  parent review (not this child's to request).

## Resume next
- Nothing to resume in SP-108C. Next actionable row in the SP-108 README queue:
  **SP-108D** (`Needs refinement` → refine, then implement: remove the
  `@tanstack/*` packages and lockfile entries, flip the root README architecture
  line, run the full verification). Per [delivery state], the combined SP-108
  review follows SP-108D, not this child.

> Resume SP-108D as implementer. Read repo instructions and
> docs/stories/SP-108/artifacts/SP-108D/checkpoint.md (create it first), reconcile
> Git state, and continue the first incomplete step. Preserve unrelated work.