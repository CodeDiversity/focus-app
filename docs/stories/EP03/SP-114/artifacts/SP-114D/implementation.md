# SP-114D implementation

**Status:** Implemented — awaiting combined SP-114 parent review.
**Date:** 2026-10-24
**Scope:** SP-114D only; baseline `0f47d72` (refine(SP-114) tickets).
**Contract:** [parent shared API contract and D114-1…4](../../README.md#shared-api-contract) + ticket decisions D114-1…5.

## Acceptance criteria outcomes

| AC | Outcome / evidence |
|---|---|
| 1 — PATCH partial body; unknown fields 400 | Pass. `UpdateAssignmentDto` declares only the five editable fields; `status`/`actualHours`/`courseId`/`userId` are undeclared → 400 via the global pipe's `forbidNonWhitelisted` and the service's `validateSync` re-check (whitelist + forbid). Unit: 4 unknown-field cases + 18 invalid-value cases, all with field-level `errors` maps and no query/write. Real HTTP: all four unknown fields 400 with `errors.<field>`, row unchanged. |
| 2 — PATCH null semantics (D114-5) | Pass. Explicit `null` = omitted for all five fields (`has()` normalization); `description: ''` is written as-is (the only clearable field); empty or all-null body → 400 `At least one field must be provided` (the courses/meetings precedent). Unit: nulls keep stored values, `''` clears, empty + all-null → 400. Real HTTP: same three behaviors verified over the wire. |
| 3 — PATCH ownership | Pass. `findFirst({ where: ownedWhere(userId, id) })` → uniform 404 `Resource not found` for missing, foreign, or malformed ids (no existence oracle). Unit: 4 id/owner cases. Real HTTP two-student matrix: student B's PATCH of A's row (foreign), a fresh UUID (missing), and `not-an-id` (malformed) all → identical 404 body; A's row byte-identical before/after; B's account stays empty. |
| 4 — PATCH response | Pass. `toAssignmentResponse()` reused — exactly the 10-key `CourseAssignment` projection (unit asserts the full object; HTTP asserts the key set + values). The updated row also appears in the course-detail `assignments` projection. |
| 5 — DELETE ownership + task cascade | Pass. Same ownership gate; the write is scoped `where: ownedWhere(userId, id)`. Real-DB cascade case: a task seeded directly via `app.prisma` (no tasks API yet — story 4) survives the delete with `assignmentId: null` and its `userId` intact (Prisma default `SetNull`, D114-4 — no migration needed). Two-student DELETE matrix: B's foreign/missing/malformed attempts → uniform 404, A's row unchanged. |
| 6 — DELETE 204 | Pass. `@Delete(':id')` + `@HttpCode(HttpStatus.NO_CONTENT)`; service returns `void`. Real HTTP: 204 with an empty body; the row is gone. |
| 7 — Validation rules same as create, only when present | Pass. The DTO mirrors `CreateAssignmentDto`'s per-field rules (title non-whitespace ≤200; description ≤2000; strict persistable ISO-8601 datetime incl. the `Date.parse` guard; `0 < h ≤ 1000`; 4-value priority enum) with every field `@IsOptional()`. The service validates the **merged** (post-patch) values with the same rules — the create's single-rule-source pattern. Unit + production-pipe matrices cover invalid values (incl. `42` title, `'2'` hours string, non-persistable ISO dates) and valid partials. |
| 8 — Data-scoping tests | Pass. `assignments-data-scoping.spec.ts` extended: two-student PATCH matrix, two-student DELETE matrix, own-DELETE 204, real-DB task cascade, and unauthenticated 401s — all against real HTTP/Postgres (34 tests). |

DoD 9 (API documentation): contract documented in the [parent README](../../README.md#shared-api-contract); no schema/migration change (D114-4 uses the model's existing `SetNull` default).

## Changed paths / commit scope

- `apps/api/src/modules/assignments/dto/update-assignment.dto.ts` (new).
- `apps/api/src/modules/assignments/assignments.service.ts` — `update()`/`delete()` + private `assertDto()`; `Prisma` import for the P2025 → uniform 404 in `update()`.
- `apps/api/src/modules/assignments/assignments.controller.ts` — `PATCH /assignments/:id` (200 projection) + `DELETE /assignments/:id` (204).
- `apps/api/src/modules/assignments/assignments.service.spec.ts` — extended (108 tests total; 62 new: update/delete service behavior + `UpdateAssignmentDto` production-pipe matrix).
- `apps/api/src/modules/assignments/assignments-data-scoping.spec.ts` — extended (34 tests total; 7 new real-HTTP/Postgres tests).
- This child's checkpoint/implementation record, child's Status/artifact pointer, and parent README execution fields/table only.
- Unchanged by design: `assignments.module.ts` (controller already registered — ticket: no module change), `assignments-e2e.spec.ts` (the e2e extension is SP-114F's named obligation; D ran it as a regression), the courses module, the Prisma schema/migrations.
- Unrelated pre-existing dirty paths preserved and excluded from the commit: `.gitignore`, SP-113 README/ticket/review/walkthrough docs.
- One scoped implementation/closeout commit; its verified hash is returned in the task handoff (not embedded in its own content).

## Findings / deviations and final dispositions

| ID / source | Observed issue / affected paths | Disposition / closure evidence |
|---|---|---|
| F114D-1 — AC 1/4 | First `typecheck` failed (TS2322): the declared `data` object type allowed `priority: … \| null`, which Prisma's `AssignmentUpdateInput` rejects. | **Fixed**, implementer. Narrowed the declared `data` field types to non-null (`has()` already excludes nulls before the spread). Typecheck passes; all gates re-run after. |
| F114D-2 — AC 8 | Authoring slip in the new data-scoping tests: stray third `201` argument on `post()` calls (2-parameter helper). | **Fixed**, implementer, by inspection before the file's first run; no red run occurred. Prettier/lint/typecheck all pass on the final file. |
| F114D-3 — closeout | First `eslint` pass reported 46 Prettier formatting errors across the four touched files. | **Fixed**, implementer, via `format:write` (only the four owned files changed); typecheck/lint/format + full suite re-verified green afterward. |

Deviation notes (no AC impact): the ticket's "inspected code paths" cite `common/validation.pipe.ts`; the actual path is `common/pipes/validation.pipe.ts` (same doc correction SP-113A recorded). The service reuses one `assertDto()` helper for both the raw-DTO and merged-value `validateSync` re-checks — one rule source, the create pattern, rather than duplicating the 14-line block twice.

## Verification (executed)

All commands run from `apps/api` against the final (post-format) working tree. No secret/environment files read. `DATABASE_URL` pointed only at a newly initialized **disposable** local trust-auth PostgreSQL 18 cluster on `127.0.0.1:55439` (never a shared database); the cluster was stopped and removed after the final run.

| Command | Result |
|---|---|
| `pnpm exec prisma migrate deploy` (disposable DATABASE_URL) | Pass; all 12 migrations applied to the fresh database. |
| `pnpm exec jest --runInBand assignments.service.spec.ts` | Pass — 108 tests (no DB needed). |
| `pnpm exec jest --runInBand assignments-data-scoping.spec.ts` (disposable DATABASE_URL) | Pass — 34 tests, real HTTP/Postgres. |
| `pnpm exec jest --runInBand assignments-e2e.spec.ts` (disposable DATABASE_URL) | Pass — 16 tests (SP-113C regression; the e2e extension is SP-114F's). |
| `pnpm exec jest --runInBand` (disposable DATABASE_URL) | Pass — **41 suites / 796 tests, zero failures** on the final code. |
| `pnpm typecheck` | Pass on final code. |
| `pnpm exec eslint 'src/**/*.ts' --max-warnings 0` | Pass, non-mutating, final code. |
| `pnpm format` | Pass all API TypeScript after the F114D-3 fix. |

## DoD and remaining work

Backend DoD 1–4, 8–9 satisfied by the implementation and tests above (DoD 5–7 are UI obligations owned by E; DoD 10 by F + the combined parent review). No open findings. Next: **SP-114E needs its `ui-refiner` pass** before implementation (queue). SP-114F (e2e extension + DoD-10 sign-off + parent index) and the combined SP-114 review remain. No child reviewer dispatched.
