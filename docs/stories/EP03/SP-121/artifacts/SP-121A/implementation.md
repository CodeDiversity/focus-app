# SP-121A implementation record

**Story:** [SP-121A — Assignment Status API](../../SP-121A-assignment-status-api.md)
**Role:** implementer (backend). **Date:** 2026-10-26.
**Baseline before first change:** `0c6a619` (working tree clean at start).
**Status:** implementation complete — awaiting parent review (combined SP-121 review after SP-121B; no per-child review).

## Outcome

`PATCH /assignments/:id` now accepts `status` — the closed five-value
`AssignmentStatus` enum (`PENDING | IN_PROGRESS | COMPLETED | SUBMITTED |
GRADED`, D121-2) — with keep-on-null semantics (D121-3). Create is unchanged:
`status` stays a rejected unknown field and new assignments start `PENDING`
(D121-1). `GET /courses/:id` is untouched (D121-5). No migration — the column
and enum already existed. The four update-path rejection cases encoding the old
behavior were retired (unit service-level, unit pipe-level, data-scoping loop,
e2e it.each); the create-path rejection cases stay.

## AC-by-AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 Accept | Pass | Unit `it.each` over all five values: scoped `update` write with `data: { status }`, projection reflects the new value. E2E lifecycle walk (PENDING → IN_PROGRESS → COMPLETED) with 200 projections and DB row read-back. Data-scoping GRADED round-trip persists. |
| 2 Null semantics | Pass | Unit keep-on-null `it.each([null, undefined])` — write carries only the companion field; status-only body accepted as non-empty; all-null body (now including `status: null`) still 400s "At least one field must be provided"; e2e asserts `status: null` alone → 400 and with a companion field keeps `COMPLETED`. |
| 3 Invalid values | Pass | `DONE`, `completed`, `1`, `true` → field-level `errors.status` 400 with no `findFirst`/`update` (unit service re-check `it.each`), at pipe level (unit), and over HTTP with no write (e2e loop). Validation runs on merged values (unchanged `assertDto(merged)` path; merged object gained `status`). |
| 4 Create unchanged | Pass | `CreateAssignmentDto` untouched; create-path `['status','COMPLETED']` rejection cases kept in all three specs; e2e lifecycle asserts create → `PENDING`. |
| 5 Ownership | Pass | Write still `ownedWhere(userId, id)` with P2025 → uniform-404 normalization (unchanged). New: student B PATCHes A's assignment with `status: "COMPLETED"` (foreign/missing/malformed ids) → uniform 404, A's row unchanged (data-scoping); e2e `status: "SUBMITTED"` on a foreign id → uniform 404, target stays `PENDING`. |
| 6 Locked fields stay locked | Pass | Unit unknown-fields `it.each` keeps `actualHours`/`courseId`/`userId` (400, no query or write); new combined-body test: `status: "COMPLETED"` + `actualHours: 5` → 400 on `actualHours` only, no write. Data-scoping unknown-fields loop keeps the three (status entry retired). |
| 7 Projection unchanged | Pass | `KEYS`/`ASSIGNMENT_KEYS`/`PROJECTED_ASSIGNMENT_KEYS` assertions hold unmodified; e2e reads back from `GET /courses/:id` — the finished assignment is still present with `status: "COMPLETED"` and the unchanged key set; data-scoping GRADED test asserts the projection contains the patched row (`{ ...patched.body, subtasks: [] }`). |

## Changed paths

Production:
- `apps/api/src/modules/assignments/dto/update-assignment.dto.ts` — `status` field (`@IsOptional() @IsIn([...five])`, `| null` union, mirroring `priority`/`type`); class comment updated (unknown-fields list drops `status`).
- `apps/api/src/modules/assignments/assignments.service.ts` — `AssignmentStatus` import; `update()`: `has(dto.status)` in the at-least-one check, merged object gains `status`, `data` type union + conditional write; method doc comment updated.
- `apps/api/src/modules/assignments/assignments.controller.ts` — PATCH doc comment lists `status?` with the enum and D121-1/2/3 notes.

Tests:
- `apps/api/src/modules/assignments/assignments.service.spec.ts` — retired the two update-path `['status','COMPLETED']` cases; added five-value patch `it.each`, status-only non-empty body + merged re-check, keep-on-null `it.each`, `status`+`actualHours` locked-field test, invalid values in the service re-check and pipe-level `it.each`s, pipe-level five-value acceptance and omitted/null acceptance; explicit-nulls and all-null body tests extended with `status: null`. Create-path cases untouched.
- `apps/api/src/modules/assignments/assignments-data-scoping.spec.ts` — retired the update-path loop `status` entry; added cross-student status PATCH → uniform 404 (row unchanged) and GRADED round-trip persistence + projection assertions. Create-path `it.each` untouched.
- `apps/api/src/modules/assignments/assignments-e2e.spec.ts` — retired the update-path `it.each` `status` entry; added the full lifecycle round-trip (incl. invalid-value loop, null semantics, `GET /courses/:id` read-back) and the foreign-id `SUBMITTED` → uniform 404 test. Create-path `it.each` untouched.

Docs:
- `docs/stories/EP03/SP-121/README.md` (queue row A, active/next fields), `SP-121A-assignment-status-api.md` (Status), `artifacts/SP-121A/checkpoint.md`, this record.

## Verification

| Check | Command (cwd) | Result |
|---|---|---|
| Unit (no DB) | `pnpm --filter @studypilot/api exec jest --runInBand assignments.service.spec.ts` (repo root) | **241/241 passed** |
| DB-backed story specs | `pnpm exec dotenv -e .env.local -- jest --runInBand assignments-data-scoping.spec.ts assignments-e2e.spec.ts` (`apps/api`) | **2 suites, 113/113 passed, 0 skipped** — executed against the local dev Postgres (port 5432, already running); the env file was loaded via the repo's own dotenv pattern, never read or quoted |
| Full API suite (with DB) | `pnpm exec dotenv -e .env.local -- jest --runInBand` (`apps/api`) | **42/42 suites, 997/997 passed, 0 skipped** |
| Typecheck | `pnpm --filter @studypilot/api typecheck` (repo root) | exit 0 |
| Lint | `pnpm exec eslint src/modules/assignments --max-warnings 0` (`apps/api`) | exit 0 |
| Format | `pnpm exec prettier --config ../../packages/config/prettier/.prettierrc.cjs --check "src/modules/assignments/**/*.ts"` (`apps/api`) | clean |

All results are from committed-or-scoped working tree state at the commit
recorded below; tests were run before the commit and nothing changed after.

## Findings/deviations

- **F-121A-1** (deviation, minor; closed): the story lists the invalid-status
  cases as additions; they were implemented by extending the existing
  service-level "rechecks invalid" and pipe-level "rejects" `it.each` tables
  (plus the e2e loop) rather than as standalone tests — identical coverage,
  follows the file's established pattern. Owner: implementer. Closure: table
  entries present; all runs green.
- **F-121A-2** (addition, minor; closed): pipe-level invalid-status cases
  (`DONE`, `completed`, `1`, `true`) were added beyond the story's literal
  service-level list, mirroring how `type` invalids are covered at both levels
  (DoD 2). Owner: implementer. Closure: green pipe-level run.
- No blockers, no failed checks, no contract deviations. `Findings/deviations:
  None` beyond the two minor items above.

## Commit scope

Single commit, baseline `0c6a619`: the six `apps/api/src/modules/assignments/`
files above plus the four docs paths (README queue fields, story Status,
checkpoint, this record). No unrelated files staged; hooks not bypassed.
Commit hash: recorded in the returned handoff and the parent queue (a commit
cannot contain its own hash).
