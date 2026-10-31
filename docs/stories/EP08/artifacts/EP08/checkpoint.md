# EP08 fix-round-1 checkpoint (parent review unit)
Updated: 2026-10-31 (night, local) — **CLOSED OUT** (round complete, awaiting re-review)
Execution state: docs/stories/EP08/README.md execution queue (all six rows `Implemented — awaiting parent review`; parent review verdict FAIL at pass 1 → correction round 1 implemented)
Story: docs/stories/EP08/README.md (parent) — correction round 1 on `./review.md`
Review unit: EP08 parent + EP08A…EP08F; findings source `./review.md` (verdict FAIL)
Role / scope: implementer; correction round 1. In: F-01 API tests + recovery-surface blame-free assertion; F-02 evidence correction ONLY (no Dialog.tsx, no waiver); P-04 naming; P-02/P-03 assess-or-route; P-05 pin-or-refactor; P-01 record-only; `apps/api/tsconfig.json` disposition. Out: F-02 fix/waiver, F-03 human evidence, finding-closure wording, README `## Autopilot`, contract/decision/AC sections, foreign dirty paths.

## Repository state
- Workspace / branch: /Users/michaelrobert/Desktop/focus-app, `main`
- HEAD at start: `a075ee3`
- Saved work: see this round's commits (test(EP08) specs; docs(EP08) records/queue) — hashes returned with the closeout.
- Preserved untouched: `.agents/skills/autopilot/SKILL.md`, `.agents/workflow-graph.md` (foreign dirty paths — never staged). `apps/api/tsconfig.json` stray tweak **reverted** this round (disposition in `./fix-round-1.md`).

## Progress
- [x] Reads: review.md, README queue/contract, EP08A/EP08C/EP08E/EP08F stories+records, service/controller/spec/e2e/scoping code, backend skill
- [x] F-01: unit spec `study-plans-recovery-catch-up.service.spec.ts` — 20 tests, executed DB-free
- [x] F-01: gated `study-plans-catch-up-e2e.spec.ts` (13) + `study-plans-catch-up-data-scoping.spec.ts` (5) — executed LIVE on a throwaway cluster (18/18) and self-skipping locally
- [x] F-01 sub-gap: blame-free assertion in `RecoverySummary.test.tsx` (6/6 recovery suite)
- [x] F-02 evidence correction (EP08F record dated note + parent index §Known gaps #1; historical text preserved)
- [x] P-04 statement in EP08E record — flake cannot be named (no surviving vitest output), stated honestly
- [x] P-02/P-03 routed to `planner` (both contract-surface) with current behavior pinned by the new specs; P-01 recorded for `planner`; P-05 closed via the review's "pin both paths with tests" option
- [x] tsconfig.json disposition: DISCARDED (dir absent; `tsconfig.e2e.json` self-excludes; HEAD content typechecks clean)
- [x] fix-round-1.md + README queue/execution-field update + scoped commits

## Decisions and dependencies
- F-02: user ruling on EP08F AC 8 still outstanding — evidence correction only. `Dialog.tsx` untouched.
- P-02/P-03 → planner (contract enum closed / EP06 shape unchanged); behavior pinned by tests in the meantime.
- P-05: pinned, not refactored (rationale in `./fix-round-1.md`).
- Throwaway-DB live run: used Homebrew `initdb`/`pg_ctl` directly (trust auth, port 5433) + `prisma migrate deploy` + `DATABASE_URL` env — cleaner than the test-env harness. Cluster created in the session temp dir, run, then stopped and deleted. No secrets involved or printed.
- **Side finding (recorded, not fixed):** first live execution of the pre-existing gated EP06 suites exposes 4 pre-existing failures (`{locked:'yes'|1}` coerced by the global pipe → 200, then a seed cascade) + the `dailyCapMinutes` carried item did NOT reproduce. Full repro + disposition in `./fix-round-1.md` §"Side finding". Routed for triage.

## Verification
| Command (cwd) | Result |
|---|---|
| `npx jest study-plans-recovery-catch-up` (apps/api, no `DATABASE_URL`) | 20 passed / 0 failed — unit evidence executes DB-free |
| `npx jest study-plans-catch-up-e2e study-plans-catch-up-data-scoping --runInBand` (apps/api, throwaway DB) | 18 passed / 0 failed — LIVE |
| `npm test` (apps/api, no `DATABASE_URL`) | 917 passed / 461 skipped / 0 failed (67 suites: 42 run, 25 self-skipped) |
| `npx jest --runInBand` (apps/api, throwaway DB) | 1374 passed / 4 failed / 0 skipped — all 4 pre-existing (side finding) |
| `npx tsc --noEmit` + `npm run lint` (apps/api) | clean / exit 0 |
| `npx vitest run` (apps/web) | 1132 passed / 100 files (baseline 1131 + 1 new) |
| `npx tsc --noEmit` + lint (apps/web) | clean / exit 0 |

Tested-state labels: unit + web executed locally; the 18 gated tests were executed live against a throwaway migrated PostgreSQL cluster (created/migrated/stopped/deleted this session) and remain `DATABASE_URL`-gated self-skippers in the normal local environment — both states recorded honestly.

## Resume next (for the re-review)
1. Read `./fix-round-1.md` — per-finding dispositions and the executed evidence.
2. Re-review target: `./review.md` §3 findings vs this round's commits.
3. Outstanding owners: user (F-02 ruling; F-03 human pass), planner (P-01/P-02/P-03 + side-finding triage routing).
