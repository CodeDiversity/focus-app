# SP-120I checkpoint

**Story:** SP-120I — Subtask API (backend) · **Parent:** SP-120
**Status:** In progress (2026-10-25)
**Implementer owner:** single sequential implementer (this session)

## Plan of record

- Four nested routes in the assignments module + two DTOs + service methods
  (ownership gates first, then subtask queries scoped `{ userId, assignmentId }`).
- `GET /courses/:id` detail include gains `tasks: { where: { userId }, orderBy:
  [{ orderIndex: 'asc' }, { createdAt: 'asc' }] }`; each projected assignment
  gains the 6-key `subtasks` array (D120-5), other 11 keys unchanged.
- No migration (D120-1). Contract fixes the shapes/errors; unit +
  data-scoping + e2e tests are this story's.

## Verification plan

1. Without DB: `pnpm --filter @studypilot/api exec jest --runInBand assignments.service.spec.ts courses.service.spec.ts`
2. With DB (Docker compose `db`): `assignments-data-scoping.spec.ts`, `assignments-e2e.spec.ts`, `subtasks-e2e.spec.ts` (new), `courses-meetings-e2e.spec.ts`
3. `pnpm --filter @studypilot/api typecheck`

## Findings / deviations

| ID | Date | Source | Paths | Observation | Disposition | Closure evidence |
|---|---|---|---|---|---|---|
| I-1 | 2026-10-25 | Contract note vs repo convention | dto/create-subtask.dto.ts | Story contract says create accepts `orderIndex?: number`; repo convention (D113, create-assignment DTO) normalizes explicit `null` optionals to "omitted". Implementing `orderIndex: null` → append-at-end via `@IsOptional` + `| null` type, consistent with every other optional in this module. | Fixed | Unit pipe test asserts append behavior for omitted/null orderIndex. |
| I-2 | 2026-10-25 | docker daemon not running | — | Docker Desktop was stopped; local `db` service needed for the DB-backed specs. | Fixed | `open -a Docker` + `docker compose up -d db` before the DB run. |
| I-3 | 2026-10-25 | DATABASE_URL not set in shell env | — | `.env.local` is not read by me (secret-file rule). Integration run uses `dotenv -e apps/api/.env.local --` (repo's own `db:migrate` pattern) so values are never displayed. | Fixed | DB-backed jest run below. |
| I-4 | 2026-10-25 | SP-114D precedence vs initial spec | assignments.service.ts | For PATCH subtask with an empty body: implementation checks the assignment ownership gate **before** the at-least-one check (foreign id + empty body → 404, not 400; the SP-114D order). An early spec asserted 400-without-queries; corrected to the SP-114D precedence after confirming the pattern in the existing `update()` flow. | Fixed | `assignments.service.spec.ts` at-least-one tests pass with the aligned expectations. |
| I-5 | 2026-10-25 | courses.service.spec.ts ordering passthrough | courses.service.spec.ts | The subtask projection must not re-sort (the include's ordering is the contract); the first spec draft squared a deliberately unsorted fixture against a sorted expectation. Fixed the expectation, not the idempotent contract. | Fixed | courses.service.spec.ts passes (284/284 with assignments spec). |
| I-6 | 2026-10-25 | Empty path segment | assignments-data-scoping.spec.ts | An `/assignments//subtasks` request (empty path segment) is answered by the Express router ("Cannot GET …", 404) before the Nest pipeline reaches the service — not the app's uniform `Resource not found`. The app-level empty-id case stays covered in `assignments.service.spec.ts` (uniform 404). HTTP matrix asserts the uniform shape for the other malformed ids only. | Fixed | 72/72 data-scoping pass. |
| I-7 | 2026-10-25 | Test-state leakage in new e2e | subtasks-e2e.spec.ts | The round-trip spec first asserted the post-swap list `[10, 1]`; the contract orders `orderIndex` **asc** ([1, 10]). The wrong assertion aborted that test's cleanup, so leftover rows cascaded into the next tests' orderIndex (append max+1) and projections. Fixed the ordering expectation and added per-test cleanup + a `createdAt` tie-break block (same orderIndex → creation-time order). | Fixed | subtasks-e2e 5/5 pass. |
| I-8 | 2026-10-25 | Key-list constants scope | assignments-e2e.spec.ts | First attempt merged the 11-key direct-response keys with the 12-key detail keys in one constant; direct POST/PATCH `/assignments` responses correctly stay 11-key (D120-5 adds `subtasks` only in the course-detail projection). Split into `ASSIGNMENT_KEYS` + `PROJECTED_ASSIGNMENT_KEYS`. | Fixed | assignments-e2e 38/38 pass. |

## Progress

- [x] Context read (queue, story, contract, code baseline, test conventions)
- [x] DTOs: create-subtask / update-subtask
- [x] Service subtask methods + 6-key projection
- [x] Controller routes
- [x] Courses detail projection (D120-5)
- [x] Unit specs (service + DTO pipes + course projection key updates) — 284 pass
- [x] Data-scoping specs (+ `toContainEqual` updates for the new `subtasks` key) — 72 pass (real DB)
- [x] E2E specs (new subtasks-e2e + forced key-list updates) — 5 + 38 + 19 pass (real DB)
- [x] Verification runs (unit 641 pass / DB-backed 134 pass / typecheck / lint / prettier)
- [x] implementation.md + closeout

**Status: implementation complete — awaiting parent review** (combined SP-120
review happens after SP-120J is implemented; no per-child review).

## Next action

None within this child. SP-120J next: `ui-refiner` pass, then implementation
(not this child's scope).
