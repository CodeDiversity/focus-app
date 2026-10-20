# SP-110A implementation record

**Story:** [SP-110A — Semester Management API](../../SP-110A-semester-management-api.md)
**Parent / review unit:** SP-110 (combined parent review after A+B+C; index owner SP-110C)
**Layer:** Backend — `apps/api/src/modules/semesters/`
**Baseline:** `37db4b0` (plan: SP-110C …) — the commit before the first included change.
**Completed:** 2026-10-20, implementer, single sequential writer.

## Outcome

The `semesters` module is now the full semester management surface: `POST`
(SP-107B, unchanged) plus `GET /semesters` (list + `courseCount`),
`GET /semesters/:id`, `PATCH /semesters/:id` (partial merge incl. single-active
activation, D110-1), and `DELETE /semesters/:id` (courses orphaned, D110-2) —
all principal-scoped, uniform-404, with the shared contract from the
[breakdown README](../../README.md#shared-api-contract) implemented exactly.
No schema change, no migration.

## Changed paths

| Path | Change |
|---|---|
| `apps/api/src/modules/semesters/dto/update-semester.dto.ts` | **New** — all four fields optional (`name`/`startDate`/`endDate`/`isActive`), same validators as `CreateSemesterDto` + `@IsBoolean()`; explicit null = omitted |
| `apps/api/src/modules/semesters/semesters.service.ts` | `list` (principal `where`, `_count.courses`, `startDate` desc / `name` asc), `get` (`findFirst {id,userId}` → uniform 404), `update` (merge → validate merged values → 400 field-level; at-least-one-field 400; P2002 → specific 409; P2025 → uniform 404; `isActive:true` one-transaction deactivate-others + activate; `isActive:false` deactivate-only), `delete` (one transaction: courses `semesterId: null` + scoped delete; P2025 → uniform 404, rollback). `create` and the 7-key `toResponse` unchanged; new `toCountedResponse` adds `courseCount`. Module header comments updated (full management surface; remaining EP02 extension is course-side only) |
| `apps/api/src/modules/semesters/semesters.controller.ts` | Four new routes with `@CurrentUser()`; `:id` plain string (malformed → 404, never 400 — repo convention); `@HttpCode(HttpStatus.NO_CONTENT)` on DELETE (see finding F110A-1) |
| `apps/api/src/modules/semesters/semesters.module.ts` | Header comment only (EP02 handoff note updated) |
| `apps/api/src/modules/semesters/semesters.service.spec.ts` | Extended: 42 tests — list (principal-only where, ordering, projection), get (hit/miss), patch merge matrix (each field alone, null omitted, `end==start` / `end<start` / start-after-end on merged values, over-long/whitespace name, malformed/impossible dates, empty body, 409, 404, P2025), activation (one transaction, both writes `userId`-scoped; `isActive:false` deactivate-only), delete (one transaction setNull + scoped delete; P2025 → uniform 404) |
| `apps/api/src/modules/semesters/semesters-data-scoping.spec.ts` | Extended: 31 tests — SP-107B blocks preserved verbatim plus list (8-key shape, ordering incl. name-asc tie-break, no cross-student leak), GET :id (own / foreign / missing → uniform 404), two-student PATCH/DELETE matrix (uniform 404, A's rows byte-identical, no writes), single-active (activate one of three → exactly one active; concurrent activation → exactly one active, both 200, last-write-wins; B's rows untouched), delete-orphan (204; two courses survive with `semesterId: null`; second delete 404), PATCH 400s (unknown field, `userId` in body, empty body) + 409 collision + merged-date violation, 401 on all five routes |

## AC-by-AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 — `GET /semesters` principal-only, `startDate` desc / `name` asc, `SemesterWithCount`, 401 unauthenticated | Pass | unit `list` block; data-scoping `GET /semesters (list)` (3 rows, tie-break order `Alpha < Fall` on equal start date, B's same-named row never leaked, 8 keys, `courseCount`) + 401 case |
| 2 — `GET /semesters/:id` own → 200; missing/foreign → uniform 404, no existence oracle | Pass | unit `get` block; data-scoping `GET /semesters/:id` (own 200 8-key; B on A's id → 404 `Resource not found`; missing id → identical 404) |
| 3 — `PATCH` partial merge; validation on **merged** values; 400 field-level; 409 name collision; 404 uniform | Pass | unit `update` block (each field alone, explicit-null omitted, merged `end==start` / `end<start` / start-after-end, over-long/whitespace name, malformed + impossible dates, empty body, P2002 → specific 409, P2025 → uniform 404, foreign id → 404 before any write); data-scoping `PATCH validation` (unknown field, `userId` in body, empty body, 409, merged-date violation with row unchanged) |
| 4 — Activation (D110-1): one transaction deactivate-others + activate; `isActive:false` deactivate-only; last-write-wins; at most one active | Pass | unit activation cases (single `$transaction`, both writes carry `userId`); data-scoping `single-active activation` (activate one of three → exactly one active; concurrent activation of two → exactly one active afterwards, both responses 200; B's semesters untouched) |
| 5 — `DELETE` → 204; courses explicitly `semesterId: null` in the same transaction; missing/foreign → uniform 404, no writes | Pass | unit `delete` block (one transaction: scoped `course.updateMany` setNull + scoped `semester.delete`; P2025 → uniform 404); data-scoping `delete orphans courses` (204; both course rows survive with `semesterId: null`; second delete → 404) + matrix case (B's DELETE on A's row → 404, row still exists) |
| 6 — All four routes 401 unauthenticated; `userId` from the JWT principal only, never from the body | Pass | data-scoping `unauthenticated → 401` (all five routes incl. POST) + `userId` in PATCH body → 400 (`forbidNonWhitelisted`), never honored |

## Verification

Commands run from the repo root; the data-scoping suite ran against a
**disposable** local Postgres (ephemeral `postgres:15-alpine` container,
migrations applied via `prisma migrate deploy`, removed after the run — no
shared or persistent database touched):

| Command (cwd: repo root) | Result |
|---|---|
| `DATABASE_URL=<disposable 5433 db> pnpm --filter @studypilot/api exec jest --runInBand` | **33/33 suites, 446/446 tests pass** (all integration suites executed, zero skips) |
| `pnpm --filter @studypilot/api exec jest --runInBand` (no `DATABASE_URL`) | 26 suites pass, 7 integration suites self-skip (102 tests), 344 pass — the bare local path works |
| `pnpm --filter @studypilot/api typecheck` | clean |
| `pnpm --filter @studypilot/api lint` (`--max-warnings 0`) | clean |

DoD: 1 ✓ (ACs above) · 2 ✓ (DTO + service re-check + global pipe) · 3 ✓
(principal-scoped everywhere, uniform 404, no existence oracle) · 4 ✓
(field-level 400, specific 409, uniform 404) · 5–7 N/A (backend-only child) ·
8 ✓ (unit + data-scoping incl. the single-active race) · 9 ✓ (contract in the
breakdown README; **no migration — no schema change**) · 10 → via SP-110C
sign-off + the combined parent review (not this child).

## Findings and deviations

- **F110A-1 (fixed):** Nest 10.4 returns **200, not 204**, for a void DELETE
  handler — `RouterExecutionContext` presets the status from
  `getStatusByMethod` (OK for DELETE; only POST maps to CREATED) and
  `ExpressAdapter.reply` re-applies it for a nil body. The contract requires
  204. **Fix:** explicit `@HttpCode(HttpStatus.NO_CONTENT)` on
  `SemestersController.remove`. Evidence: first data-scoping run failed
  `expected 204 "No Content", got 200 "OK"`; green after the fix.
- **F110A-2 (fixed, process-level):** the shared prettier config uses
  `printWidth: 100`; the first draft of the data-scoping suite used a
  multi-line `describeIntegration(...)` signature (102 chars), which made
  `eslint --fix` re-indent the entire file body (~777 lines of diff noise).
  **Fix:** suite title shortened to fit one line; diff reduced to
  389 insertions / 9 deletions with the pre-existing SP-107B tests preserved
  verbatim.
- **Deviations from the ticket:** none on scope, files, or behavior. The
  `@HttpCode` decorator is the minimal mechanism for the contract's 204
  (the ticket fixes the status, not the mechanism).

## Remaining work (this child)

None. Integration/e2e lifecycle proof, manual browser sign-off (DoD 10) and
the parent index belong to SP-110C; the UI to SP-110B.
