# EP08F implementation record
Updated: 2026-10-31 (night, local)
Story: docs/stories/EP08/EP08F-cross-layer-e2e-and-parent-index.md
Status: Implemented — awaiting combined EP08 parent review
Checkpoint: ./checkpoint.md

Verify-only story: one new Playwright spec + the parent index + TR-E08-08 evidence
collection. No production code, no existing spec edits.

## AC-by-AC outcomes

Execution labels are honest: **executed** = ran green in the recorded Playwright
runs; **gated-skip** = cannot run in this local environment; **documented** =
covered by record/automation, not manually executed here.

- AC 1 — full replan journey E2E: **Done, executed** (`e2e/catch-up.spec.ts:265`
  "journey: missed sessions → preview → edit → confirm → the saved plan survives a
  reload"). Missed sessions seeded through the real API (plan saved with sessions on
  past days inside the server's rollover tolerance, `from >= today-6`); preview
  asserted against the app's own `POST /study-plans/catch-up/preview` response
  captured with `page.waitForResponse`; edit moves one proposal and deletes another;
  confirm; `page.reload()` survival; final exact edited-set comparison re-read from
  the server; assignment status and study logs proven unchanged (immutability).
- AC 2 — decline leaves the plan unchanged: **Done, executed** (`:378`). No confirm
  request fires ('Not now'), and the full plan payload re-read after decline is
  byte-identical to the payload captured before the flow.
- AC 3 — locked session survives confirm unchanged: **Done, executed** (`:438`).
  Lock driven through `PATCH /api/study-plans/sessions/:id/lock`; confirmed time via
  `POST /api/study-sessions` + `finish {confirmedMinutes:45}`; after confirm the
  locked row's fields and the row count are proven unchanged and no overlap was
  scheduled onto it.
- AC 4 — feasibility warning displayed: **Done, executed** (`:514`). Tight-deadline
  assignment; server `warnings` from the app's own preview response matched 1:1 with
  the rendered `WorkloadWarnings` copy; assignment due date unchanged after the
  flow.
- AC 5 — completed-assignment exclusion: **Done, executed** (`:557`). Planned
  session on a past day, assignment then `COMPLETED` via the API; session absent
  from `GET /study-plans/recovery-summary` and absent from the `/catch-up` UI.
- AC 6 — recorded confirmed time reaches the recovery summary: **Done, executed**
  (`:612`). Real start→finish (45 min) flow; the recovery summary's remaining-work
  row shows the 45-minute confirmed line both via API and in the UI.
- AC 7 — EP04 calendar regression stays green: **Done, executed**. New in-progress
  (null `endTime`) render test (`:651`) green in every run; the pre-existing
  calendar specs' null-endTime cases unaffected (calendar.spec passes except the
  pre-existing SP-129A focus failure reported under AC 8, which is unrelated to
  null-`endTime` handling).
- AC 8 — pre-existing suites stay green: **Done with reported pre-existing
  failures**. See "Suite baseline evidence" below — the tree as received already
  carried two deterministic E2E failures (focus restoration after Escape) and they
  are identical with and without this story's file; nothing this story changed
  caused or masks them. `study-plans-e2e.spec.ts` dailyCapMinutes: still reported,
  still not a blocker (AC text); the api integration specs self-skip locally
  (no `DATABASE_URL` in the Playwright process env) and were green-or-gated in the
  EP08E vitest evidence (897 passed / 443 skipped).
- AC 9 — parent implementation index: **Done** —
  `docs/stories/EP08/artifacts/EP08/implementation.md` written (baselines, child
  commits, evidence per child, known gaps, traceability).
- AC 10 — manual a11y evidence (TR-E08-08) collected: **Done, partially executed** —
  see "TR-E08-08 evidence" below. Keyboard + narrow-screen + focus-visible
  durable Playwright evidence executed; VoiceOver and reduced-motion remain
  documented-not-executed (flagged for the combined review walkthrough).

## Suite baseline evidence (AC 8)

Self-contained stack (throwaway DB + API :4100 + Vite :3100), logs in the session
temp dir:

- `e2e-catchup-run1.log` — new spec only: 8/9 green, 1 narrow-viewport test fixed
  (walker bug), re-run 2/2 green.
- `e2e-full-run2.log` — full suite with new spec: **40 passed, 2 failed, 5 did not
  run (16.2s)**; all 9 `catch-up.spec.ts` tests passed in this run.
- `e2e-baseline-run.log` — full suite with `catch-up.spec.ts` **removed** (control):
  **31 passed, the same 2 failed, 5 did not run** — proves the two failures are
  pre-existing on HEAD `9c0b222` and independent of this story.
- `e2e-focused-fail.log` — the two specs alone: both fail again → deterministic,
  not `fullyParallel` flake.
- `e2e-full-run3.log` — final recorded run with the spec back: identical to run 2
  (40 passed / same 2 failed).

Pre-existing failures (NOT caused by EP08F, out of scope to fix here):

1. `e2e/assignments-list.spec.ts:23` — after Escape-closing the create dialog,
   `toBeFocused()` on "Add your first assignment" fails (focus lands elsewhere).
2. `e2e/calendar.spec.ts:100` (SP-129A phone agenda) — after Escape, the entry
   button is not the focused element (probe showed focus lands on the calendar
   control).

Both are modal/popover **focus-restoration-on-Escape** assertions in EP03/EP04-era
specs. A repo-wide grep finds no focus-restore logic (`restoreFocus`/`triggerRef`/
`lastFocused`) in the current component tree; the recent SP-109 folder-reorg
commits (`e0bc484`…`8e30bad`) are the plausible point where the behavior was lost.
**Carry-forward: needs its own fix story or a parent-review decision.**

## TR-E08-08 evidence (aggregated for the combined review)

Executed durable automation (new, runs on every E2E run):

- `/catch-up` at 320×568 (`catch-up.spec.ts:682`): no page-level horizontal
  overflow; replan entry ≥44px target; header buttons stacked; Tab-only path from
  document start to the replan entry with a visible focus ring (computed
  `box-shadow`), all via keyboard.
- `/catch-up/preview` at 320×568 (`:731`): controls stack and stay ≥44px tappable;
  the lock toggle is operable by click and its state persists to the server
  (verified via API re-read).
- EP08D/EP08E vitest keyboard tests (executed in their suites): focus-to-`<h1>` on
  entry, header/editor/toggle driven by Tab/Enter, aria-pressed toggle semantics,
  live announcements, `role="alert"` error paths.

Recorded from child records (documented, executed at design/impl time): EP08D
ui-refiner decision set + EP08E AC 10 pass (non-blaming copy test, responsive
header/grid mirror `PlanPage` breakpoints).

**Documented-not-executed (honest gaps for the reviewer walkthrough):** macOS
VoiceOver screen-reader path through `/catch-up` → preview → confirm; and
reduced-motion behavior (no animation forks were added, but it was never manually
observed). These need a human pass at the combined EP08 review.

## Changed paths

- `apps/web/e2e/catch-up.spec.ts` (**new**) — 9 tests (7 journey/proof + 2 narrow
  viewport a11y).
- `docs/stories/EP08/artifacts/EP08/implementation.md` (**new**) — parent index.
- `docs/stories/EP08/artifacts/EP08F/checkpoint.md` (**new**) — child checkpoint.
- `docs/stories/EP08/artifacts/EP08F/implementation.md` (this file).
- `docs/stories/EP08/EP08F-cross-layer-e2e-and-parent-index.md` — Status →
  Implemented — awaiting combined parent review.
- `docs/stories/EP08/README.md` — EP08F queue row + Active/Next fields (hunk-
  filtered commit; `### Autopilot` section belongs to the coordinator and is never
  staged here).

No production backend/frontend files touched. No existing spec edited.

## Verification

Working directory: `/Users/michaelrobert/Desktop/focus-app`

- `npm run typecheck --workspace=apps/web` — exit 0.
- `npx eslint e2e/catch-up.spec.ts --max-warnings 0` (in `apps/web`) — exit 0.
- `npm run test:e2e --workspace=apps/web -- catch-up --reporter=list` — 9/9 green.
- `npm run test:e2e --workspace=apps/web -- --reporter=list` — 40 passed; 2
  pre-existing failures (see above); logs retained: `e2e-full-run2.log`,
  `e2e-full-run3.log`; control runs: `e2e-baseline-run.log`,
  `e2e-focused-fail.log`.
- API/web unit suites: unchanged by this story; per-child evidence stands (web
  vitest 1131/1131 at EP08E; api 897 passed / 443 skipped).

## Key implementation decisions (test-only)

- Missed sessions seeded via the real API only: a saved plan with rows on past days
  inside the server's 6-day rollover tolerance yields genuine missed SCHEDULED
  rows; direct-DB seeding rejected (would bypass the scoping/validation surface
  under test).
- All date fixtures derive from the server-returned window (`from`/`to` of the
  preview/plan); the browser never computes "today" (EP06H lesson).
- Reload-survival and immutability re-read from the server, not from cache.
- Preview assertions use the app's own preview POST captured via
  `page.waitForResponse` (`waitForPreviewResponse`) — no duplicate client-side
  recomputation of expectations.
- Environment quirk worked around in the keyboard walker: a `new RegExp(source)`
  built from a `page.evaluate` string argument does not match inside the page, and
  `\u0000` sentinels vanish across the evaluate boundary — the `tabUntil` helper
  returns `{desc, text}` and does regex matching in Node. Do not reintroduce
  in-page regex matching.

## Known gaps / carry-forwards for the combined review

- Two pre-existing E2E focus-restoration failures (AC 8 section) — need triage
  outside EP08.
- `study-plans-e2e.spec.ts` dailyCapMinutes failure remains open upstream per the
  story text; self-skips locally, reported not blocking.
- VoiceOver + reduced-motion manual pass not executed here (TR-E08-08 label above).
- `getPlan` returns rows without `locked` (planner open question from EP08A); the
  lock-toggle UI re-syncs locally — flag for reviewer.
- Per-assignment `confirmedMinutes` is State A per V-08-5 (aggregate only).
