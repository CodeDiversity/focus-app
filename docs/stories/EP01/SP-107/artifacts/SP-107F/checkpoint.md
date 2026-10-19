# SP-107F checkpoint

Updated: 2026-10-18 (dispatch `SP107-implementer-F`; resumed and closed out
by the new implementer owner after the dispatch died mid-task — runtime error,
no code difference)
Execution state: [parent queue row F](../../README.md#execution-queue)
Story: [SP-107F-wizard-integration.md](../../SP-107F-wizard-integration.md)
Review unit: SP-107 (STUDY-8) — parent index at `../SP-107/implementation.md`
Role / scope: implementer; SP-107F integration child only — the e2e spec, the
DoD-10 sign-off record, and the parent index. Excluded: any product behavior
change (a case failing on product code is a finding against A–E, not a fix
here, unless it is a harness-wiring defect).

## Repository state

- Workspace / branch: `/Users/michael/Documents/GitHub/focus-app`, `main`
- HEAD at last update: `3dfa317` at dispatch (autopilot bookkeeping on top of
  `14e7a25` = SP-107E; coordinator snapshot said `14e7a25` — see F-107F-1);
  after closeout: `b2662d0` (this child's commit).
- Saved work: A `9885601`, B `03a412a`, C `5863b44`, D `687a876`, E `14e7a25`
  (all verified in the queue). F closeout: `b2662d0` (e2e spec + SP-107F/SP-107
  artifacts + README execution fields; hash also recorded in the returned
  handoff and the coordinator's `## Autopilot` run record).
- Other work to preserve: none (working tree clean at dispatch).

## Progress

- [x] Reconciled repo state; harness already carries `OnboardingModule`
      (SP-107A `9885601`) + `SemestersModule`/`CoursesModule` (SP-107B
      `03a412a`) in `apps/api/src/test/test-http.ts` — the ticket's harness
      extension was completed ahead by A/B; **no harness change needed** (F-107F-2).
- [x] Local dev Postgres verified migrated (9/9, `prisma migrate status` →
      "Database schema is up to date!" via the `dotenv -e .env.local` wrapper;
      DB `studypilot` @ localhost:5432 — per coordinator instruction, tests run
      against it; specs self-clean their seeded rows).
- [x] Backfill state of the dev DB queried read-only (F-107F-3): 3 users,
      3/3 `onboardingCompletedAt` set, 0 null; 2 rows pre-migration (both
      backfilled at the migration's `now()` 2026-10-18 14:14:20 UTC); 1 row
      carries the backfill timestamp despite a later `createdAt` (anomaly
      recorded, no action — see F-107F-3).
- [x] Write `apps/api/src/modules/onboarding/onboarding-e2e.spec.ts` (AC1–AC6)
- [x] Run the e2e spec against the migrated dev DB — **10/10 passed**
      (AC1 1, AC2 1, AC3 1, AC4 2, AC5 3, AC6 2; the P2002 log line is the
      expected own-duplicate → 409 case)
- [x] Full verification — all green (see Verification): API **33/33 suites,
      400/400 tests, 0 skipped** (390 baseline + 10 new e2e); web **26/26
      files, 283/283 tests** (SP-107E baseline, no regression); typecheck +
      lint clean in both apps (the API `lint --fix` touched nothing).
- [x] Post-run dev-DB state verified: 3 users (the same 3 as pre-run), 0
      semesters, 0 courses, 0 `studypilot-test.invalid` rows — cleanup
      cascaded correctly.
- [x] Record AC-7 manual sign-off as **CANNOT VERIFY** (no human browser
      session in this runtime) with the exact human steps + closure path
- [x] Write `../SP-107F/implementation.md` (this child's record)
- [x] Write the parent index `../SP-107/implementation.md` (AC8)
- [x] README queue closeout (row F, Active/Next) + scoped commit

Current step: closed out. The closeout commit's hash is recorded in the
returned handoff and the coordinator's `## Autopilot` run record (per the
record's commit-scope convention — a commit cannot contain its own hash);
the queue row and the parent index reference it the same way.

## Decisions and dependencies

- Journey mapping (ticket ACs 1–6): student **A** = complete flow (AC1) +
  terminal (AC4); student **B** = resume mid-flow (AC2) + skip (AC3) + the
  isolation targets (AC5); a **backfill-sim** user seeded directly via the
  harness `prisma` handle (completedAt set, step 1) proves "wizard never
  offered" for pre-migration-style rows (AC6); a 4th fresh registration
  proves "post-migration registration starts at step 1" (AC6).
- AC4 "entry-point resolution" at API level: the e2e asserts `GET
  /onboarding` → `completed: true` on every session (incl. a fresh login) —
  the decision input the frontend entry points consume; the redirect
  behavior itself is pinned by SP-107C's component tests (web suite re-run).
- AC-7 (DoD 10) is a HUMAN gate: recorded CANNOT VERIFY with reason + exact
  steps; closure path = human performs the walk, coordinator records the
  user's ratification with provenance (SP-106D precedent: the human returns
  approval/limitations, which are transcribed into the record).
- Contract source: [shared API contract](../../README.md#shared-api-contract).
- `PATCH /users/me` step-1 write: `{ name, timeZone }` (SP-106B contract).

## Verification

All run 2026-10-18 against the local dev PostgreSQL (port 5432, DB
`studypilot`, 9/9 migrations) via the `dotenv -e .env.local` wrapper — the
coordinator-verified target; `.env*` files were never read or displayed.

| Check | Command (cwd) | Result |
|---|---|---|
| Migration state | `pnpm --filter @studypilot/api exec dotenv -e .env.local -- npx prisma migrate status` (repo root) | 9 migrations, "Database schema is up to date!" |
| Backfill counts (read-only) | `dotenv -e .env.local` + `psql` (query string stripped of Prisma-only params) | 3 users / 3 completed / 0 null; 2 pre-migration rows (both backfilled) |
| New e2e spec | `pnpm --filter @studypilot/api exec dotenv -e .env.local -- npx jest onboarding-e2e --runInBand` (repo root) | **1 suite / 10 tests passed** (AC1 1, AC2 1, AC3 1, AC4 2, AC5 3, AC6 2) |
| Full API suite | `pnpm --filter @studypilot/api exec dotenv -e .env.local -- npx jest --runInBand` (repo root) | **33/33 suites, 400/400 tests passed, 0 skipped** (baseline 32/390 + this spec) |
| Full web suite | `pnpm --filter @studypilot/web exec vitest run` (repo root) | **26/26 files, 283/283 tests passed** (SP-107E baseline — no regression) |
| Typecheck | `pnpm --filter @studypilot/api typecheck` / `pnpm --filter @studypilot/web typecheck` | clean (both) |
| Lint | `pnpm --filter @studypilot/api lint` / `pnpm --filter @studypilot/web lint` | clean (both; `--max-warnings 0`; the API `--fix` pass touched no files) |
| Post-run DB state | `dotenv -e .env.local` + `psql` | 3 users (same 3), 0 semesters, 0 courses, 0 test emails — cleanup verified |

## Findings

- **F-107F-1** (open→note): coordinator snapshot said HEAD `14e7a25`; actual
  HEAD is `3dfa317` (autopilot bookkeeping commit, no code). Baseline for this
  child's changes: `3dfa317`. Disposition: recorded, no action.
- **F-107F-2** (fixed by prior children): the ticket assigns the `test-http.ts`
  module imports to F, but SP-107A/SP-107B already added them (git log:
  `9885601`, `03a412a`). No harness change in this child; the spec runs
  against the existing wiring. Disposition: recorded in implementation.md.
- **F-107F-3** (recorded, no action): dev-DB anomaly — user
  `mtrew2015@gmail.com` (created 2026-10-18 15:19:31 UTC) carries
  `onboardingCompletedAt = 2026-10-18 14:14:20 UTC`, the backfill's
  `now()`, despite being created ~1 h after the migration's `finished_at`.
  Consistent with the backfill `UPDATE` executing inside a long-lived
  migration transaction (statement snapshot taken after the row's
  registration; `now()` = transaction start). Does not affect the AC-6
  claim: all 3 rows are completed (wizard never offered for them) and
  post-migration registrations are proven to start at step 1 in the e2e
  suite. Flagged for the coordinator's awareness only.

## Resume next

1. `apps/api/src/modules/onboarding/onboarding-e2e.spec.ts` — write the suite
   (design in Decisions above), then run it with the `dotenv -e .env.local`
   wrapper and expect all tests green.
2. Full verification per the ticket (API suite zero skips; web vitest;
   typecheck + lint both apps).
- Read next: none beyond what is linked (contract + services already
  inspected: onboarding/semesters/courses controllers+services+DTOs,
  `users-profile-integration.spec.ts` and `onboarding.integration.spec.ts`
  patterns, `OnboardingPage.tsx` entry-point behavior).
