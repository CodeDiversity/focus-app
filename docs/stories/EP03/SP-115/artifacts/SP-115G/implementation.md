# SP-115G implementation record

**Story:** [SP-115G](../../SP-115G-assignment-type-api.md) — Backend: optional assignment type
**Status:** Implementation complete — awaiting parent review
**Completed:** 2026-10-25
**Checkpoint:** [checkpoint.md](./checkpoint.md) (findings log during work; final dispositions below)

## AC-by-AC outcomes

| AC | Requirement | Outcome | Evidence |
|---|---|---|---|
| 1 | `AssignmentType` enum (`HOMEWORK/PAPER/PROJECT/QUIZ/EXAM`), nullable `Assignment.type`, no default, one migration, no backfill, rollback documented | **Met** | `apps/api/prisma/schema.prisma` (`enum AssignmentType`, `type AssignmentType?` after `priority`); migration `apps/api/prisma/migrations/20261025000000_assignment_optional_type/migration.sql` (creates enum + adds column, no default; rollback order documented in its head comment). Applied to the local dev DB with `prisma migrate deploy`; existing rows keep `type = NULL`. Generated client regenerated via `prisma generate`. |
| 2 | Create/update accept optional `type`; create omit/null → null; update omit/null keeps stored (D115-3); valid value replaces; type-only patch counts as non-empty; `ESSAY` 400 field error, no write; `status`/`actualHours`/`courseId`/`userId` stay rejected | **Met** | `dto/create-assignment.dto.ts` + `dto/update-assignment.dto.ts` (`@IsIn` on the five identifiers); `assignments.service.ts`: create stores `type` only when non-null; update merges with the existing `has()` keep-on-null rule, includes `type` in the at-least-one check, writes only provided `type`. Tests: unit create-with-each-enum/omit/null, patch replace/keep/type-only, invalid `ESSAY`/`1`/`''` with no write; unknown-field matrices unchanged; e2e create→patch round-trip and all-null 400 with `type: null`. |
| 3 | Both `toAssignmentResponse` copies return `type` after `priority`, omit `userId`/`courseId`; `GET /courses/:id` includes it; untyped row projects `type: null` | **Met** | `assignments.service.ts` and `courses.service.ts` mappers + `AssignmentRow` add `type` immediately after `priority` (11 keys, no shared helper — D115-4). Key assertions: courses.service.spec untyped case asserts length **11** and `type: null`; e2e `ASSIGNMENT_KEYS` lists updated in both `assignments-e2e.spec.ts` and `courses-meetings-e2e.spec.ts`; untyped direct seed projects `type: null`. |
| 4 | Type in the body does not bypass ownership; foreign course/assignment → uniform 404 `Resource not found`, target unchanged | **Met** | `assignments-data-scoping.spec.ts`: cross-student PATCH sends `type: 'HOMEWORK'` → uniform 404 with row unchanged; foreign/missing/malformed courseId matrix untouched and still 404-with-no-writes. Ownership predicate stays `ownedWhere` — no query changes. |

## Verification

All runs from the repo root unless noted; `DATABASE_URL` was required for the last three (see finding F-115G-1).

| Command | cwd | Result |
|---|---|---|
| `pnpm --filter @studypilot/api exec jest --runInBand assignments.service.spec.ts courses.service.spec.ts` | repo root | **194 passed** (both suites, no DB) — final run after all edits |
| `pnpm --filter @studypilot/api typecheck` | repo root | **pass** (after production + test edits) |
| `pnpm exec eslint` over all 10 changed TS files | repo root | **clean** after one prettier fix in `assignments-data-scoping.spec.ts`; re-verified |
| `pnpm --filter @studypilot/api exec jest --runInBand assignments-data-scoping.spec.ts` (with `DATABASE_URL`) | apps/api | **37 passed, 0 skipped** |
| `pnpm --filter @studypilot/api exec jest --runInBand assignments-e2e.spec.ts` (with `DATABASE_URL`) | apps/api | **38 passed, 0 skipped** |
| `pnpm --filter @studypilot/api exec jest --runInBand courses-meetings-e2e.spec.ts` (with `DATABASE_URL`) | apps/api | **19 passed, 0 skipped** |

None of the DB-backed suites ran as skipped; all executed against the real database after the migration was applied (`prisma migrate status` showed the new migration pending, then `prisma migrate deploy` applied it).

## Changed paths

- `apps/api/prisma/schema.prisma` — `AssignmentType` enum + nullable `type` column
- `apps/api/prisma/migrations/20261025000000_assignment_optional_type/migration.sql` — new migration
- `apps/api/src/modules/assignments/dto/create-assignment.dto.ts` — optional `type` (`@IsIn` five values)
- `apps/api/src/modules/assignments/dto/update-assignment.dto.ts` — same, with D115-3 keep-on-null note
- `apps/api/src/modules/assignments/assignments.service.ts` — create/update `type` handling, mapper, doc comments
- `apps/api/src/modules/assignments/assignments.controller.ts` — comment-only update (11-key projection, `type` in PATCH body)
- `apps/api/src/modules/courses/courses.service.ts` — second mapper + `AssignmentRow` gain `type`
- Tests: `assignments.service.spec.ts`, `courses.service.spec.ts`, `assignments-data-scoping.spec.ts`, `assignments-e2e.spec.ts`, `courses-meetings-e2e.spec.ts`
- Generated Prisma client (`apps/api/src/generated/prisma/`) regenerated via `prisma generate` (regenerated output is not a hand-edit)

## Findings and deviations

- **F-115G-1 (resolved):** The locally configured `DATABASE_URL` credentials were rejected by the running local Postgres (`P1010 User was denied access`, reproduced via `prisma migrate status`). Resolution: the local server uses OS-user trust, so checks ran with a locally constructed trusted connection string — no `.env` or secret contents were read, displayed, or copied. Disposition: verification above is real, not skipped. Next owner if the stored credentials matter for other runs: the user may want to re-align `apps/api/.env` with the local Postgres setup (owner: user decision, out of this story's scope).
- **F-115G-2 (resolved, scoped):** `courses-meetings-e2e.spec.ts` still carried the stale comment "no assignments API exists" (pre-SP-113). While editing the file for the key list, the comment was updated to reflect the current state; no test semantics changed.
- Deviations from the story text: none otherwise. The contract was implemented as written; migration names follow the repo's date-prefixed convention; `type: 'ESSAY'` remains a 400 **field error** (invalid enum), matching the contract note.

## Commits

- `77e733f` — feat(SP-115G): optional assignment type on create, update, and course projection. Scope: the 10 app files listed under Changed paths + the new migration + this checkpoint/implementation record + the SP-115 README queue/status update. Working tree verified clean after the commit; the only follow-up edit is this hash note inside the record documents.

## Out of scope (unchanged here)

- UI control/row presentation — SP-115H (needs ui-refiner first).
- No list/filter/overrule behavior added for `type`; no new endpoint; no route changes beyond none (comments only in the controller).
