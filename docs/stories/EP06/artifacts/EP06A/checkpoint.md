# EP06A checkpoint

Updated: 2026-10-30 15:05 EDT
Execution state: [EP06 README queue](../../README.md#execution-queue) row EP06A — `Implemented — awaiting parent review`
Story: [EP06A-study-preferences-shape-and-api.md](../../EP06A-study-preferences-shape-and-api.md)
Review unit: EP06 combined parent review (`../EP06/review.md` + `../EP06/walkthrough.md`) after EP06H — this child is one of the eight children of that unit
Role / scope: implementer; **backend only** — the `studyDefaults` shape, its validation, the defensive reader and `GET/PUT /study-preferences`. Excluded: EP06B (remaining work + `StudySession` aggregation), EP06C (engine + conflict rules), EP06D (plan persistence/migration/plan API), EP06E (all frontend), any narrowing of `PATCH /users/me`'s free-form `preferences` bag (D06-14), the calendar read model (D06-18 / seam V-05-1).
Result record: [implementation.md](./implementation.md)

## Repository state

- Workspace / branch: `/Users/michaelrobert/Desktop/focus-app`, `main`
- Baseline HEAD before changes: `e846176` (the plan-review pass-3 commit); the plan's own baseline is `9b1ec19`
- Saved work: this child's scoped commit — `7457a0a` (the application code, the tests and the two module-list registrations); this checkpoint, the implementation record and the status updates are committed separately (the closeout commit; its hash is returned in the handoff).
- Other work to preserve: `apps/api/tsconfig.json` — pre-existing, unrelated, modified and **unstaged** (it adds `dist-test` to `exclude`). It is not mine: never stage it, never commit it, leave it modified.

## Progress

- [x] Read the repo role rules, the implementer/backend skills, the checkpoint + closeout contracts, the EP06 README (queue, shared contract, decision register, code baseline, invariants) and the EP06A child spec.
- [x] Read the cited code precedents: `common/ownership/ownership.ts`, `modules/availability/*` (the projection, `dtoErrors`, `throwFieldErrors`, the merged-value validation, `ConflictException`, `assertAffected`), `modules/users/*` (the bag, its two validators, the partial update), `app.module.ts`, `test/test-http.ts`.
- [x] `apps/api/src/domain/study-planning/types.ts` + `preferences.ts` — the shape, the bounds, the defaults, the cross-field validator and the defensive reader (the four ordered steps).
- [x] `apps/api/src/domain/study-planning/preferences.spec.ts` — 27 domain unit tests (the fallback matrix, each repair step, the worked examples, the post-condition fuzz, the validator).
- [x] `apps/api/src/modules/study-plans/` — the module, the controller, the service, the DTO.
- [x] `apps/api/src/modules/study-plans/study-plans.service.spec.ts` (17), `study-plans-data-scoping.spec.ts` (5), `study-plans-e2e.spec.ts` (13).
- [x] `apps/api/src/app.module.ts` + `apps/api/src/test/test-http.ts` — both module lists gained `StudyPlansModule`.
- [x] Verification: `-- study-plans` 35/35, `-- preferences` 27/27, the whole API suite 53 suites / 1151 tests, `typecheck` exit 0, `lint` exit 0.
- [x] README queue + the child's `**Status:**`/artifact pointers + the implementation record.
- Current step: none — EP06A implementation complete; do not start EP06B (the coordinator dispatches the next writer).

## Decisions and dependencies

- **The reader's input is the whole `preferences` bag** (child spec, implementation note 2) and it reads the `studyDefaults` key from it; the bag's other keys are never read.
- **The reader's four ordered steps** (per-field bounds fallback → repair the inverted min/max pair → clamp `sessionLengthMinutes` into `[min, max]` → raise `dailyCapMinutes` to `minSessionMinutes`) are implemented exactly as written; the two worked examples (`60 / 90 / 120 / 240` → `90 / 90 / 120 / 240`, `60 / 300 / 200 / 240` → `200 / 200 / 200 / 240`) are pinned by tests.
- **The merge rule**: `PUT` reads the current *effective* values (through the reader), applies the client's subset on top, validates the merged result, writes the complete four-key object into `preferences.studyDefaults` and leaves every other key of the bag untouched. An invalid merged value → 400 with a field-level `errors` map and **nothing written**.
- **Ownership**: the `User` row *is* the principal's row (`User.id` is the userId; the model has no `userId` column, so `ownedWhere` — which adds a `userId` column — does not apply to `User`), so the scoped where is `{ id: userId }`; the write goes through `updateMany` + `assertAffected(userId, count)`, so a vanished row is the uniform 404 `Resource not found` (never 403, never a distinct message).
- **Route paths are top-level** — `GET /study-preferences` / `PUT /study-preferences` (the `/availability-slots` precedent), **not** under `/users`.
- The module directory is `apps/api/src/modules/study-plans/` (the spec's choice): this child ships only the preferences half of it; EP06B/EP06D extend the same module.
- The domain module lives at `apps/api/src/domain/study-planning/` (D06-17) and imports nothing from `@nestjs/*` and nothing from Prisma.
- **An empty `PUT` body is an empty subset** (a legal request that re-writes the effective values); the `availability` module's "at least one field" rule belongs to its PATCH semantics, not to this PUT.

## Findings

| ID | Requirement / source | Affected paths | Observed issue | Disposition | Owner | Closure evidence |
|---|---|---|---|---|---|---|
| F-A-1 | Child spec note 2 vs. the dispatch brief's wording | `apps/api/src/domain/study-planning/preferences.ts` | The reader's parameter is described as "the whole `preferences` value" (spec) and as "bag" (brief); the two readings differ (whole bag vs. the `studyDefaults` object itself). The spec is the contract: the reader takes the whole preferences bag and reads `studyDefaults` from it. | **resolved (interpretation, no deviation)** | implementer | The function's JSDoc and the unit spec pin the whole-bag input; `readStudyPreferences(preferencesBag)` is the single entry point. |
| F-A-2 | Test environment | `apps/api/src/test/test-http.ts` (harness), the integration specs | `DATABASE_URL` is unset in this shell, so every integration spec self-skips (`describeIntegration = process.env.DATABASE_URL ? describe : describe.skip`) — the e2e/data-scoping evidence would be vacuous. The machine has a local PostgreSQL on 5432 whose `studypilot` database is migrated (13 migrations, `prisma migrate status` → "Database schema is up to date!"). | **resolved** — the suite ran with `DATABASE_URL=postgresql://michaelrobert@localhost:5432/studypilot` (the local dev database the repo's own `db:migrate` targets); no secret file was read. | implementer | The verification table in [implementation.md](./implementation.md#verification) records the exact command, cwd and result with the database named. |
| F-A-3 | Implementation note 4 (the bag's 4096-byte cap) | `apps/api/src/modules/study-plans/study-plans.service.ts` | The `preferences` column is capped at 4096 serialized bytes by the users module's `IsBoundedSizeValidator`; merging `studyDefaults` into a bag that is already near the cap could exceed it. | **resolved in the implementation** — the cap is re-checked on the *resulting* bag after the merge and reported as a field-level 400 (`errors.preferences`) before any write. | implementer | `study-plans.service.spec.ts` (the cap case) + the e2e spec's "nothing written" assertions. |
| F-A-4 | D06-14 (the bag's second writer) — observed during the e2e run | `apps/api/src/modules/users/users.service.ts:97-99` (read-only observation), `apps/api/src/modules/study-plans/study-plans-e2e.spec.ts` | `PATCH /users/me` writes the `preferences` column **verbatim**, i.e. it **replaces** the column instead of merging into it: a student who saved study defaults through `PUT /study-preferences` and then PATCHes `/users/me` with any `preferences` bag **loses** the saved `studyDefaults`. D06-14 records the residual risk as "the stored value may differ"; in fact the second writer can remove the whole object. | **recorded — not fixed** (out of EP06A's scope: narrowing `PATCH /users/me` is explicitly excluded by the child spec and D06-14 and would require changing EP01's `users-profile-integration.spec.ts:147-160`). EP06's reader stays defensive, so nothing breaks — the effective values fall back to the defaults until the student re-saves them. | **coordinator** (a planner/EP01 decision if a single writer is wanted) | The e2e spec documents the real behaviour (the bag's other keys are seeded **before** the study defaults, because the PATCH replaces the column); the finding is carried in [implementation.md](./implementation.md#findings-and-deviations). |

## Verification

- `pnpm --filter api test -- study-plans` (cwd `/Users/michaelrobert/Desktop/focus-app`, `DATABASE_URL` = the local `studypilot` database) — **3 suites / 35 tests passed**, exit 0.
- `pnpm --filter api test -- preferences` (same cwd) — **1 suite / 27 tests passed**, exit 0.
- `pnpm --filter api test` (same cwd) — **53 suites / 1151 tests passed**, exit 0 (the pre-change baseline was 49 suites / 1089 tests; the users module's specs stay green).
- `pnpm --filter api typecheck` (same cwd) — exit 0.
- `pnpm --filter api lint` (same cwd) — exit 0, 0 warnings (`--max-warnings 0`); `prettier --check` on the new files is clean.
- The pre-change baseline (`pnpm --filter api test` at `e846176`, before any edit) — 49 suites / 1089 tests passed.

## Resume next

1. None for EP06A — the implementation is complete and committed; the next child (EP06B) is dispatched by the coordinator in a **fresh** implementer context.
2. The next actionable child is **EP06B** — the remaining-work calculation and `GET /study-plans/remaining-work`. Its prerequisite (EP06A) is now satisfied: the shared `StudyPreferences` type lives in `apps/api/src/domain/study-planning/types.ts` and the domain module folder exists. EP06B extends the same `apps/api/src/modules/study-plans/` module.
- Read next: [implementation.md](./implementation.md) (the completed behavior, the verification and the findings); the EP06A story only if the reviewer raises findings.
