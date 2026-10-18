# SP-107B implementation record

**Status:** implementation complete — awaiting parent review
**Date:** 2026-10-18
**Implementer:** implementer (single writer; dispatch `SP107-implementer-B` under the SP-107 autopilot run)
**Baseline:** `8bc7f15` (HEAD before the first included change)
**Scope:** minimal `POST /semesters` + `POST /courses` (student-scoped), `Semester` `@db.Date` migration, unit + integration tests. Excluded: SP-107C–F, EP02 endpoints, `docs/jira-sync/`, other stories' artifacts.

## Changed paths

| Path | Change |
|---|---|
| `apps/api/prisma/schema.prisma` | `Semester.startDate`/`endDate` → `DateTime @db.Date` (D107-7, `StudyPlan.date` precedent) |
| `apps/api/prisma/migrations/20261018232322_semester_course_dates/migration.sql` | new — casts both columns to `DATE` with explicit `USING …::date` |
| `apps/api/src/common/lib/calendar-date.ts` | new — strict `yyyy-MM-dd` parse (UTC-midnight `Date`) + format |
| `apps/api/src/modules/semesters/` | new — module, controller, service, `dto/create-semester.dto.ts`, `semesters.service.spec.ts`, `semesters-data-scoping.spec.ts` |
| `apps/api/src/modules/courses/` | new — module, controller, service, `dto/create-course.dto.ts`, `courses.service.spec.ts`, `courses-data-scoping.spec.ts` |
| `apps/api/src/app.module.ts` | registers `SemestersModule` + `CoursesModule` |
| `apps/api/src/test/test-http.ts` | registers both modules (integration harness parity with `AppModule`) |
| `docs/stories/EP01/SP-107/README.md` | execution fields + queue row B only (planner content untouched) |
| `docs/stories/EP01/SP-107/artifacts/SP-107B/` | this record + [checkpoint](./checkpoint.md) |

`apps/api/src/generated/prisma/` is gitignored (regenerated locally via
`prisma generate`; nothing committed).

## AC-by-AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 — `POST /semesters` 201 `{ id, name, startDate, endDate, isActive, createdAt, updatedAt }`, dates `yyyy-MM-dd` | Pass | `semesters.service.spec.ts` (shape + serialization, `isActive` absent from create data → schema default `false`); `semesters-data-scoping.spec.ts` "201 create" (exact 7-key shape over HTTP) |
| 2 — validation: name non-empty-after-trim ≤ 100; valid `yyyy-MM-dd` dates; `end` strictly after `start` → 400 field-level; duplicate name → 409 specific message | Pass | DTO constraints + service re-check (both layers); unit spec 400/409 blocks; integration 400/409 blocks (incl. unknown field `isActive` → 400, proving it is not settable) |
| 3 — `@db.Date` columns + migration (cast existing rows; record row count) | Pass | Migration `20261018232322_semester_course_dates` applied; pre-cast row count: **0 semesters, 0 courses** (cast a no-op, as anticipated); column types verified `date`; round-trip proven in the integration persistence test |
| 4 — `POST /courses` 201 matching the frontend `Course` type shape | Pass | `courses.service.spec.ts` (exact 9-key shape); `courses-data-scoping.spec.ts` "201 shape" (exact keys + schema defaults `#6366f1`/null/`true`) |
| 5 — course validation: code ≤ 20, name ≤ 100, `0 < credits ≤ 30`, `#rrggbb` color, description ≤ 2000 → 400 field-level; duplicate code → 409 specific message | Pass | unit 400/409 blocks (incl. boundary values 30 / `#abcdef` / 2000); integration 400/409 blocks |
| 6 — `semesterId` ownership: missing or foreign → uniform 404 `Resource not found`, no row written; omitted → `semesterId: null` | Pass | `courses.service.spec.ts` (scoped `findFirst`, uniform 404, no `create` call); integration: B posts A's semester → 404, no course row, A's semester untouched; missing id → byte-identical 404; own id → 201 attached; omitted → null (direct `PrismaService` re-read) |
| 7 — 401 unauthenticated; unknown body fields → 400 via global pipe; no list/get/update/delete routes | Pass | integration 401 on **both** routes; unknown-field 400 in both specs; both modules declare only `@Post()` (EP02 extends in-place, D107-9) |

DoD (ticket): 1–4 and 8 pass as above; 5–7 N/A (backend-only child);
9 satisfied by this record + the migration + the [shared API contract](../../README.md#shared-api-contract) in the README (contract unchanged — planner-owned, implemented as written); 10 is SP-107F + the combined parent review (not this child).

## API contract implemented (DoD 9)

```text
POST /semesters   body { name, startDate, endDate }   dates: yyyy-MM-dd
  201 { id, name, startDate, endDate, isActive, createdAt, updatedAt }
  400 field-level errors (name, startDate, endDate) · 409 duplicate name · 401
POST /courses     body { code, name, semesterId?, description?, credits?, color? }
  201 frontend Course shape (id, code, name, description, color, credits, isActive, createdAt, updatedAt)
  400 field-level · 404 uniform (semesterId missing/foreign) · 409 duplicate code · 401
```

`isActive` is not settable on either endpoint (schema defaults `false` /
`true`); the global `FieldValidationPipe` (`forbidNonWhitelisted`) rejects
unknown fields including a client-supplied `userId` or `isActive`.

## Verification

All commands from the repo root via `pnpm --filter @studypilot/api`; the
`dotenv -e .env.local` wrapper supplies `DATABASE_URL` (local dev Postgres on
5432; the `.env*` file itself was never read or displayed).

| Check | Command | Result |
|---|---|---|
| Migration | `exec dotenv -e .env.local -- npx prisma migrate dev --name semester_course_dates` | created + applied `20261018232322_semester_course_dates`; client regenerated |
| Deploy | `exec dotenv -e .env.local -- npx prisma migrate deploy` | 9 migrations, "No pending migrations to apply" |
| Row count (pre-cast) | `pnpm exec dotenv -e .env.local -- node -e '<pg count query>'` (cwd `apps/api`) | 0 semesters / 0 courses; column types `date`/`date` |
| Full suite | `exec dotenv -e .env.local -- npx jest --runInBand` | **32/32 suites, 390/390 tests, 0 skipped** (SP-107A baseline was 28/327; +4 suites, +63 tests — the two new unit specs (37) and two new integration specs (26) all executed, none self-skipped) |
| Typecheck | `pnpm --filter @studypilot/api typecheck` | exit 0 |
| Lint | `pnpm --filter @studypilot/api lint` (`--max-warnings 0 --fix`) | exit 0, no file modified |
| Format | `pnpm --filter @studypilot/api format` (prettier `--check`) | clean |

Tested state: local dev Postgres with all 9 migrations applied; seeded
students/semesters/courses from the integration specs are cascade-deleted in
each spec's `afterAll` (user deletion cascades to semesters and courses).

## Findings / deviations

| ID | Finding | Disposition |
|---|---|---|
| F-107B-1 | Prisma 7 generated the column-type migration **without** the `USING` cast (`SET DATA TYPE DATE` only — it relies on the implicit timestamp→date cast). The ticket requires the explicit cast. | **Fixed** — `migration.sql` edited to `SET DATA TYPE DATE USING "startDate"::date` / `"endDate"::date` (identical semantics; Prisma does not checksum applied migration files, so the edit is safe). |
| F-107B-2 | `@Min(0, { exclusive: true })` does not typecheck: class-validator **0.14** has no `exclusive` option (TS2353); it landed in 0.15. | **Fixed** — `@IsPositive()` expresses the strict `0 < c` bound in 0.14 (commented in the DTO); `@Max(30)` unchanged. |
| F-107B-3 | An explicit `null` optional field (e.g. `description: null`) passes `@IsOptional()` (which skips nulls) and would reach the service as `null` → `TypeError` on `.length` → 500. | **Fixed** — service normalizes `description`/`credits`/`color` with `?? undefined` (null = omitted → schema defaults); DTO optional types widened to `… | null` to type the reality. |
| F-107B-4 | First draft of `semesters-data-scoping.spec.ts` used a module-level `agentRef` that was never bound (dead helper). | **Fixed** — the malformed-date case issues the raw request through the describe-scoped `agent`; helper removed. |
| F-107B-5 | First draft of the unit "multiple violations" case expected an `endDate` error for a *valid* `endDate` (only `name`/`startDate` were invalid). | **Fixed** — the case now invalidates all three fields and expects exactly `['endDate', 'name', 'startDate']`. |

Design decisions (recorded in the [checkpoint](./checkpoint.md); none change
the contract):

- The shared date helper lives in `common/lib/calendar-date.ts` — the ticket's
  technical notes allow "in each module or `common/lib`"; one copy serves both
  modules. (The ticket's file list is a sizing estimate, not a boundary.)
- `semesterId` in the course DTO is `@IsString()` only (no `@IsUUID()`): a
  malformed id is "missing" per the contract row → uniform 404, never 400.
  (The onboarding endpoint's 400-on-malformed-UUID is a different contract
  row with a different semantic — a *state write*, not a reference check.)
- The course 201 body is exactly the frontend `Course` type (9 keys, no
  `semesterId`) — the contract pins the shape to
  `apps/web/src/shared/types/academic.ts`; step-3 resume uses the onboarding
  state (`onboardingSemesterId`, D107-8). EP02 may extend the shape.
- The service trims `name`/`code` (AC wording: "non-empty after trim") and
  stores the trimmed values; service-level 400s carry the field-level
  `errors` map (contract: 400 → field-level errors).

**Open findings: none.** No deviations from the ticket's ACs, the shared API
contract, or the decision register (D107-5/6/7/9).

## Commit scope

One scoped commit (hash in the returned closeout) covering exactly the
"Changed paths" table above, on `main` from baseline `8bc7f15`. The
coordinator-owned `## Autopilot` run-record section of the SP-107 README was
**not** modified by this child.
