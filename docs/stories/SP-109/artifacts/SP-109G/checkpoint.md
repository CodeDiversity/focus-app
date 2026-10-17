# SP-109G Checkpoint

**Story:** SP-109G — `widgets/` layout, header, verification banner, route guards
**Date:** 2026-10-17
**Status:** In progress (resumed after a lost context)

## State found on resume (reconciled against Git and the working tree)

- Commits present: SP-109C `e0bc48a`, SP-109D `2276b27`, SP-109E `dff638a`.
  SP-109F was **complete but uncommitted** (its implementation record and
  checkpoint had been written to repo-root `artifacts/SP-109F/` instead of the
  delivery home's artifact root `docs/stories/SP-109/artifacts/`).
- G had been **partially started** by the prior session, uncommitted:
  - done: `src/components/{Layout,Header}.tsx` → `src/widgets/{layout,header}/ui/`
    (Header byte-identical; Layout still uses `./Header` / `./EmailVerificationBanner`)
  - not done: banner + two guards, both test files, `App.tsx` repoint
- Baseline before this session finished the work:
  `pnpm --filter @studypilot/web test` → **4 failed / 15 passed (19 files)**,
  126 tests passed; failure cause `Failed to resolve import "./components/Layout" from "src/App.tsx"`.

## Reconciliation performed at start

1. Repo-root `artifacts/SP-109F/{checkpoint.md,implementation.md}` moved verbatim
   to `docs/stories/SP-109/artifacts/SP-109F/` so the queue's
   `./artifacts/SP-109F/` pointer resolves. Contents unchanged.
2. **Open gap flagged (not fixed here):** the queue's `./artifacts/SP-109E/`
   pointer has no directory — SP-109E's only evidence is commit `dff638a`.
   Reported to the parent for reconciliation; no record invented by this child.

## Remaining work for this child

- [x] `EmailVerificationBanner.tsx` + `.test.tsx` → `widgets/email-verification-banner/ui/`
- [x] `ProtectedRoute.tsx` → `widgets/protected-route/ui/`
- [x] `PublicRoute.tsx` → `widgets/public-route/ui/`
- [x] `context/ProtectedRoute.test.tsx` → `widgets/protected-route/ui/` (4 cases, no assertion edited)
- [x] widget-internal imports rewritten to `@/widgets/...` aliases (Layout, banner test, guard test)
- [x] `src/App.tsx` repointed by path only (H owns its move)
- [x] `src/components/`, `src/context/` gone; grep clean
- [x] `test` → 19 files / 193 tests, `typecheck` exit 0, `lint` exit 0
- [x] one commit for this child
- [x] queue row → `Implemented — awaiting parent review`

## Completion (2026-10-17)

All ACs 1–6 met; evidence in `implementation.md` beside this file.
Verification rerun after the last edit: 19 files / 193 tests passed,
`typecheck` exit 0, `lint` exit 0. Closing boxes are recorded in the same
commit as the code, the records and the queue update.

**Handoff to the next writer:** queue now names SP-109H as the single next
action (`pages/` + `app/` router/providers). Parent gap still open: SP-109E has
no `./artifacts/SP-109E/` directory — evidence is commit `dff638a` only.