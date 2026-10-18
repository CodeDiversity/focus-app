# SP-107A checkpoint

Updated: 2026-10-18 (resume dispatch A2 — complete)
Execution state: [SP-107 README queue](../../README.md) — row A `Implemented — awaiting parent review`; Active substory `None`; Next substory SP-107B — implement
Story: [SP-107A-onboarding-state-backend.md](../../SP-107A-onboarding-state-backend.md)
Review unit: SP-107 (parent; index will live at `../SP-107/implementation.md`)
Role / scope: implementer; SP-107A backend child only (onboarding state endpoints + User migration). Excludes: SP-107B–F.

## Repository state

- Workspace / branch: `/Users/michael/Documents/GitHub/focus-app`, `main`
- HEAD at last update: `032b66d` (jira-sync's ledger commit, landed while this dispatch ran — unrelated, owned by its role)
- Saved work: all scoped SP-107A paths committed in one scoped commit (hash in the returned closeout; see [implementation.md](./implementation.md) "Commit scope"). Working tree for this child's scoped paths: clean.
- Other work to preserve: the coordinator/autopilot-owned `## Autopilot` run-record section in [the SP-107 README](../../README.md) (dispatch/stage/handoff bookkeeping) is intentionally **not** part of this commit — per delivery-state the Autopilot role owns its README run record — and is restored to the working tree (uncommitted) for the coordinator to commit. The unrelated `docs/jira-sync/ledger.json` was committed by its owner as `032b66d` before this dispatch committed.

## Progress

- [x] Inspect existing code patterns (schema, controllers, services, tests)
- [x] Modify `schema.prisma` — 3 User columns (D107-1)
- [x] Generate Prisma migration (additive columns + D107-2 backfill; `migrate deploy` no-pending; client regenerated)
- [x] Create `onboarding/` module (controller/service/module/DTO; registered in `app.module.ts` + `test-http.ts`)
- [x] Write unit spec (19 tests) / integration spec (16 tests)
- [x] Fix service race-branch defect (F-107A-1) — `updateMany` claim pattern
- [x] Unit-spec mock plumbing on the `updateMany` pattern (expectations unchanged)
- [x] Integration spec: TS errors (F-107A-2), backfill semantics (F-107A-4), `errors` assertion (F-107A-5)
- [x] Controller `@Body()` metatype = DTO + DTO value validators (F-107A-3, F-107A-6)
- [x] Full suite green with DATABASE_URL (28/28 suites, 327/327 tests, zero skips) + typecheck + lint
- [x] Write `implementation.md`; closeout (README queue updated, scoped commit made)

## Findings / Deviations

All six findings (F-107A-1…6, service race defect, integration TS errors,
controller/DTO pipe no-op, D107-2 backfill misreading, `errors` assertion,
DTO value validation) are **fixed** and closed with evidence in
[implementation.md](./implementation.md) → "Findings / Deviations". No open findings.

## Decisions and dependencies

- D107-1 / D107-2 (README decision register) — implemented as decided.
- Race branch semantics: claim predicate `onboardingCompletedAt: null` only → zero-row claim means concurrent completion → 409; defensive not-completed re-read returns current state (pinned by unit spec); the 400 regression lives in the pre-write check (AC-4 realization note in implementation.md).
- Dependencies: SP-104 (implemented + reviewed). No blockers.

## Verification

- Full suite: `pnpm --filter @studypilot/api exec dotenv -e .env.local -- npx jest --runInBand` (repo root) → **28/28 suites, 327/327 tests, 0 skipped** (baseline: 26/28, 309/311).
- Unit: `npx jest onboarding.service.spec --runInBand` (`apps/api`) → 19/19.
- Integration: `pnpm --filter @studypilot/api exec dotenv -e .env.local -- npx jest onboarding.integration.spec --runInBand` (repo root) → 16/16 (real Postgres).
- `pnpm --filter @studypilot/api typecheck` → clean; `npx eslint "src/modules/onboarding/**/*.ts" --max-warnings 0` → clean.
- `prisma migrate deploy` (dotenv wrapper) → 8 migrations, no pending; backfill count on dev DB: 3 total / 3 completed / 0 null.

## Resume next

None — SP-107A is implementation complete, committed, and awaiting the combined
SP-107 parent review. Writer handoff relinquished; the next eligible child is
**SP-107B** (implement) per the queue.
