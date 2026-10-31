# EP08F checkpoint
Updated: 2026-10-31 (night, local — closeout)
Execution state: `docs/stories/EP08/README.md` → Execution queue → EP08F row
Story: `docs/stories/EP08/EP08F-cross-layer-e2e-and-parent-index.md`
Review unit: EP08 parent; index path `docs/stories/EP08/artifacts/EP08/implementation.md`
Role / scope: implementer; Integration layer — new Playwright spec + parent index + TR-E08-08 evidence collection. No new feature code, no edits to existing passing specs, no README `## Autopilot` section, no parent review.

## Repository state
- Workspace / branch: `/Users/michaelrobert/Desktop/focus-app` / `main`
- HEAD at last update: `9c0b222`
- Saved work: spec + records committed in two scoped commits ("test(EP08F)" spec commit, then records/queue commit) — hashes in `git log`; foreign dirty paths remain unstaged and untouched
- Other work to preserve (never touch, never stage): `.agents/skills/autopilot/SKILL.md`, `.agents/workflow-graph.md` (foreign dirty paths); README `### Autopilot` section (hunk-filter the README)

## Progress
- [x] Inputs read: story ACs, parent queue, shared DoD, contract, EP08A–E records, e2e stack (`test-env.ts`/`helpers.ts`/global setup/teardown), `/catch-up` + `/catch-up/preview` surfaces, EP06/EP07 spec patterns, ownership helpers
- [x] AC 1–7 Playwright spec `apps/web/e2e/catch-up.spec.ts` — 9 tests, 9/9 green (journey incl. reload + immutability, decline, locked preservation, feasibility warning, completed exclusion, confirmed time, EP04 null-endTime calendar regression, 2 narrow-viewport keyboard/focus tests)
- [x] AC 8 pre-existing suites: full run 40 passed; only 2 failures are **pre-existing** focus-restoration tests — proven by control runs without the new spec (`e2e-baseline-run.log`, `e2e-focused-fail.log`). dailyCapMinutes stays reported-not-blocking.
- [x] AC 9 parent index `artifacts/EP08/implementation.md` written (baselines, child commits `c1d7f95`/`aff7794`/`8a9c543`/`9f815a6`/`dde6780`+`646e93f`+`d9a7738`, traceability, gaps)
- [x] AC 10 TR-E08-08 evidence collected with honest labels (Playwright a11y executed; VoiceOver/reduced-motion documented-not-executed)
- [x] Closeout: README queue row + active/next fields, `implementation.md`, scoped commits
- Execution state: **child complete** — handed back at the child boundary; combined EP08 parent review not started (correct next role: independent reviewer)

## Decisions and dependencies
- Fixture discipline (EP06H lesson): the server window is read from `GET /api/study-plans` (`from` = server civil "today") and every fixture date is derived from that string; the browser/test never computes "today" from wall-clock and assertions compare against the server-returned `from`/`to`.
- Missed sessions are seeded through the real API: `POST /api/study-plans` accepts `from >= today-6` (window-rollover tolerance), so sessions placed on days before the server "today" are genuine past SCHEDULED rows — no DB back door, no schema change.
- Locked preservation is driven through the real toggle endpoint `PATCH /api/study-plans/sessions/:id/lock` (EP08E, commit `dde6780`).
- Confirmed time is recorded through the EP07 surface (`POST /api/study-sessions` → `POST /api/study-sessions/:id/finish` with adjusted `confirmedMinutes`), proving `RecoverySummary.confirmedMinutes` end to end.
- Completed-assignment exclusion uses `PATCH /api/assignments/:id { status: 'COMPLETED' }` — the status transition that must remove the assignment's planned sessions from missed work.
- Planner-owned open questions stay open (in-window lock list; plan-page toggle) — not resolved here.
- Approach not taken: direct Prisma seeding of past rows (would bypass the API the story verifies) and any edit to existing specs.

## Verification
- See `./implementation.md` §Verification for the executed commands and result counts (typecheck, eslint, spec runs, full-suite + control runs, log paths). All executed green except the two proven-pre-existing E2E failures reported there.
- Environment probe: `pnpm 8.15`, Node v22.23, Chromium in the Playwright cache. The self-contained stack derives `DATABASE_URL` programmatically from `apps/api/.env.local` (`test-env.ts`) — that file is never read or displayed by this role. Stack execution verified: multiple full green runs.

## Resume next
Nothing resumes in this child. Next step in the workflow graph: **combined EP08 parent review** by an independent reviewer (queue Active/Next fields updated accordingly). Carry-forwards for that review are listed in `../EP08/implementation.md` §Known gaps.
