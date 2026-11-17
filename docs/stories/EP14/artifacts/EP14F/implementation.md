# EP14F implementation record

**Story:** [EP14F — Plan Page: a Late Saved-Plan Read Never Overrides a Newer Action](../../EP14F-plan-page-load-generate-race.md)
**Status:** Implemented — awaiting parent review
**Date:** 2026-11-16
**Commit scope:** `apps/web/src/pages/plan/ui/PlanPage.tsx`, `apps/web/src/pages/plan/ui/PlanPage.test.tsx`, this record, the story Status/Ruling/sizing lines, the README queue row and pointer fields, `efficiency.md`.

Decisions applied: D-F1 — option (a), `Ratified by default, 2026-11-16` (the "Generate plan" button is never disabled while the saved read is in flight).

## What changed

`PlanPage` keeps an `actedRef` (`useRef(false)`), set to `true` at the start of
`handleGenerate`. `loadSaved({ commitMode })` still stores the saved plan on
every resolution, but only sets `mode` when `commitMode` is `true` (the
student-initiated "Try again") or when the student has not acted by the time
the read resolves. The mount effect calls `loadSaved()` (conditional commit);
the retry button calls `loadSaved({ commitMode: true })`. No visual change; the
same in-flight-guard idea as `requestSeq` on the calendar/availability pages.

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP14F-AC1 — a read resolving after Generate keeps the data but not the mode; a read resolving before any action sets `saved`/`initial` as before | **Done.** Red first: the new late-read test failed on the unmodified page (the empty state "No plan yet." replaced the preview after the deferred read resolved), and passes with the guard. Both pre-action branches are pinned. | `PlanPage.test.tsx`: "a saved-plan read that resolves after Generate leaves the preview on screen (EP14F-AC1)", "… resolves before any action sets saved (EP14F-AC1)", "… sets initial (EP14F-AC1)" |
| EP14F-AC2 — "Try again" after a failed read still sets the mode from its result | **Done.** The test arms the guard first (Generate while the read is in its error state), then retries: the saved week renders and the "Save plan" action is gone (mode `saved`, not `preview`). | `PlanPage.test.tsx`: "Try again after a failed read sets the mode from the retry result (EP14F-AC2)" |
| EP14F-AC3 — journey 1 and `study-plan.spec.ts` pass three consecutive full parallel runs with zero failures attributable to this race; no journey tuned | **Done.** Six full parallel runs on the self-contained stack (table below). Failures attributable to the race: **0 in every run**. Journey 1 passed in all six; `study-plan.spec.ts` 5/5 in the four clean runs. Runs 3 and 6 were aborted mid-run by another worktree session's Playwright stack on the same hard-coded ports (F-EP14F-02): every extra failure there is `ECONNREFUSED ::1:3100` or a SIGKILLed worker, none a UI assertion. The only persistent failures are EP14D's F-EP13M-01 pair. No spec file was changed. | runs 1, 2, 4, 5: 47 passed / 2 failed / 5 did not run each |

### Full E2E runs (2026-11-16, tested state below)

| Run | Passed / failed / did not run | Failures | Race-attributable |
|---|---|---|---|
| 1 | 47 / 2 / 5 (21.9s) | `assignments-list.spec.ts:23`, `calendar.spec.ts:100` (F-EP13M-01, EP14D) | 0 |
| 2 | 47 / 2 / 5 (19.3s) | same two | 0 |
| 3 | 10 / 21 / 23 (38.0s) — **aborted**: web :3100 unreachable from test ~10 on (`ECONNREFUSED`), cross-session port contention (F-EP14F-02) | the two above + 19 × `ECONNREFUSED` | 0 (journey 1 passed) |
| 4 | 47 / 2 / 5 (19.9s) | same two | 0 |
| 5 | 47 / 2 / 5 (20.3s) | same two | 0 |
| 6 | 38 / 11 / 5 (28.0s) — **aborted**: `ECONNREFUSED` ×4 + "worker process exited unexpectedly (SIGKILL)" while the other session's stack held :4100/:3100 | the two above + 9 infra | 0 (journey 1 passed) |

The 5 "did not run" in every clean run sit behind the two serial-file failures
owned by EP14D (same as EP14C's runs).

## Verification (2026-11-16, this worktree)

- **Tested state:** `HEAD 95906d5` + the uncommitted EP14F changes (`PlanPage.tsx`, `PlanPage.test.tsx`, story file). Runs 4–6 additionally had the next child's (EP14D) *unit-test files* modified in the tree — test files only, nothing the browser loads.
- `pnpm exec vitest run src/pages/plan/ui/PlanPage.test.tsx` (cwd `apps/web`) → 18 passed / 0 failed (15 existing + 3 new cases; the fourth new case is the second `initial` branch, 4 new `it` blocks in total).
- `pnpm exec vitest run` (cwd `apps/web`) → **111 files, 1268 passed, 0 failed** (1264 at EP13M + 4).
- `pnpm exec eslint`, `pnpm exec prettier --check` on the two files and `pnpm exec tsc --noEmit -p tsconfig.json` (cwd `apps/web`) → clean.
- **E2E command:** `pnpm --filter @studypilot/web test:e2e` from the repo root, default parallelism, self-contained stack (throwaway `postgres_e2e_test`, API :4100, Vite :3100), with shell-only env: `DATABASE_URL=postgresql://<local user>@localhost:5432/postgres` (trust auth), `JWT_SECRET=$(openssl rand -hex 32)`, `FRONTEND_URL=http://localhost:3100`. No env file exists in this worktree and none was read or written (EP13M precedent). `pnpm test:e2e` (turbo) could not be used — F-EP14F-01.

## Changed paths

- `apps/web/src/pages/plan/ui/PlanPage.tsx` — `actedRef`, `loadSaved({ commitMode })`, retry passes `commitMode: true`.
- `apps/web/src/pages/plan/ui/PlanPage.test.tsx` — 4 new cases (TR-E14-07).
- `docs/stories/EP14/EP14F-plan-page-load-generate-race.md` — Status, D-F1 Ruling, sizing actuals.
- `docs/stories/EP14/README.md` — queue row, Active/Next fields. `docs/stories/EP14/artifacts/efficiency.md` — one row.

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP14F-01 | `turbo.json` (`test:e2e.env: ["E2E_BASE_URL"]`), `apps/web/e2e/test-env.ts` | `pnpm test:e2e` runs under turbo's strict env, which strips a shell `DATABASE_URL`/`JWT_SECRET`; in a worktree without `apps/api/.env.local` the harness then fails with "DATABASE_URL is not set — create .env.local", which is misleading for the shell-env path EP13M documented. | **Not fixed** (harness/CI config, outside this story). Workaround used: `pnpm --filter @studypilot/web test:e2e` from the repo root. Candidate backlog row: pass `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` through in `turbo.json` or document the filter form. | planner |
| F-EP14F-02 | `apps/web/e2e/test-env.ts` (`E2E_API_PORT = 4100`, `E2E_WEB_PORT = 3100`) | The self-contained ports are hard-coded, so two worktree sessions running E2E at once collide: observed another session's `nest`/`vite` on :4100/:3100 during runs 3 and 6, which aborted with `ECONNREFUSED`/SIGKILL (EP13M saw the same). | **Not fixed** (E2E infra; EP14C-type scope). Recorded with the process listing; EP14D's E2E evidence will use an isolated external stack (`E2E_BASE_URL`, ports 4200/3200, own throwaway DB) as EP13M did. Candidate backlog row: derive the ports from an env offset per worktree. | planner |

## Deviations

1. The late-read test resolves the deferred read after the preview *data* is in
   state rather than "after the preview renders": while the mount-time read is
   in flight the plan region shows the week skeleton, so the preview cannot be
   on screen before the read ends. The assertion is the one that matters —
   after the late read, the preview is on screen and the empty state is not.
