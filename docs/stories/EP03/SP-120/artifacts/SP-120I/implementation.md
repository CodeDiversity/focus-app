# SP-120I implementation record

**Story:** SP-120I — Subtask API (backend) · **Parent:** [SP-120](../../../SP-120/README.md)
**Status:** Implementation complete — awaiting parent review (2026-10-25)
**Checkpoint:** [checkpoint.md](./checkpoint.md) (contains the verbose findings table; summary and dispositions below)

## AC-by-AC outcomes

| AC | Requirement | Outcome | Evidence |
|---|---|---|---|
| 1 | Four routes in the assignments controller, all auth-required (global APP_GUARD) | ✅ | `assignments.controller.ts`: `GET/POST ':id/subtasks'`, `PATCH/DELETE ':id/subtasks/:subtaskId'` (DELETE `@HttpCode(204)`). 401 asserted on all four over HTTP (`subtasks-e2e.spec.ts`, `assignments-data-scoping.spec.ts`). |
| 2 | Ownership: assignment gate first, subtasks scoped `{ userId, assignmentId }`, uniform 404, no oracle | ✅ | `assertAssignmentOwner` (`ownedWhere` + uniform `Resource not found`) runs before any subtask query; read/patch/delete scope the triple (patch: scoped where; delete: `deleteMany` + `assertAffected`). Unit gates block before any subtask query (foreign/missing/malformed, incl. cross-student and cross-assignment patch paths). DB matrix: cross-student assignment id → 404 on all 4 routes; cross-student subtask via own assignment → 404, row unchanged; own subtask via other assignment → 404, unchanged. |
| 3 | Create: title rules, optional `orderIndex` ≥ 0 int, omitted/null appends at end (max+1 or 0), unknown fields → 400, 201 = 6-key projection | ✅ | `CreateSubtaskDto` + `createSubtask` (aggregate `_max.orderIndex` → append). Unit: append 0 / max+1 / explicit slot / null-appends / 17-field invalid matrix; pipe: lifecycle fields (`status`, `priority`, `description`, `dueDate`, `estimatedMinutes`, `actualMinutes`, `userId`, `assignmentId`) rejected. Real DB: round-trip + explicit `orderIndex: 5` stored. |
| 4 | Patch: partial merge of title/status(PENDING\|COMPLETED)/orderIndex, ≥1 field, merged-value validation, unknown fields → 400, 200 = 6-key | ✅ | `UpdateSubtaskDto` + `updateSubtask` (SP-114D pattern). Unit: toggle/reorder/title-merge, empty & all-null body → `At least one field must be provided`, merged-value re-check, `ARCHIVED`/`IN_PROGRESS`/unknown fields → field-level 400 with no write; savepoint: status patch with stored title passes the merged re-check. |
| 5 | Delete: scoped removal, 204 No Content, assignment untouched | ✅ | `deleteSubtask` → `deleteMany({ id, userId, assignmentId })` → `assertAffected`; 204 with empty body over HTTP; row gone, assignment row intact (unit + both DB specs). |
| 6 | Course projection: `subtasks` (6-key, orderIndex asc then createdAt asc), 11 other keys unchanged, `subtasks: []` when empty | ✅ | `courses.service.ts` `get()` include joins `tasks: { where: { userId }, orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }] }`; `toAssignmentResponse` maps `subtasks`. Unit: exact 12-key projection, 6-key shape, no `userId`/`assignmentId` keys, ordering passthrough, empty `[]`; e2e: `GET /courses/:id` round-trip incl. `createdAt` tie-break (same orderIndex → creation order) and other student's projection empty + no cross-leak. |

## Verification (commands run in `apps/api/` unless noted)

| Check | Command | Result |
|---|---|---|
| Unit (no DB) | `env -u DATABASE_URL pnpm exec jest --runInBand` (superset of the story's `assignments.service.spec.ts courses.service.spec.ts`) | 641 passed, 332 integration self-skipped — exit 0 |
| DB-backed (real Postgres, `docker compose up -d db` + `prisma migrate deploy` up to date) | `pnpm exec dotenv -e .env.local -- jest --runInBand assignments-data-scoping.spec.ts assignments-e2e.spec.ts subtasks-e2e.spec.ts courses-meetings-e2e.spec.ts` — **not skipped** | 4 suites, 134 passed — exit 0 |
| New e2e coverage | `subtasks-e2e.spec.ts` (new file) | 5/5 incl. full round-trip, 400/404 matrix, co-ownership matrix, projection, 401s |
| Typecheck | `pnpm exec tsc --noEmit` | exit 0 |
| Lint | `pnpm exec eslint src/modules/assignments src/modules/courses --max-warnings 0` | exit 0 |
| Format | `prettier --check` on all changed TS | clean |

Individual suite results during the run: `assignments.service.spec.ts` 218→220/220 after spec-alignment fixes (I-4); `assignments-data-scoping.spec.ts` 72/72; `assignments-e2e.spec.ts` 38/38; `courses-meetings-e2e.spec.ts` 19/19 (its `ASSIGNMENT_KEYS` now 12-key per D120-5).

## Changed paths

Production:
- `apps/api/src/modules/assignments/assignments.controller.ts` — four nested routes (D120-8)
- `apps/api/src/modules/assignments/assignments.service.ts` — `listSubtasks/createSubtask/updateSubtask/deleteSubtask`, `toSubtaskResponse`, ownership gate, service-level DTO re-checks
- `apps/api/src/modules/assignments/dto/create-subtask.dto.ts` — new (D120-3; `orderIndex: null` treated as omitted, the D113 create pattern — finding I-1)
- `apps/api/src/modules/assignments/dto/update-subtask.dto.ts` — new (D120-4)
- `apps/api/src/modules/courses/courses.service.ts` — detail include + `subtasks` mapping (D120-5)

Tests:
- `assignments.service.spec.ts` — subtask service + both DTO pipe blocks
- `assignments-data-scoping.spec.ts` — new `Subtask route data scoping` block; two `toContainEqual` updates
- `assignments-e2e.spec.ts` — new `PROJECTED_ASSIGNMENT_KEYS`; two projection-comparison updates
- `subtasks-e2e.spec.ts` — new full-round-trip journey (SP-120 contract e2e)
- `courses.service.spec.ts` — `DETAIL_PROJECTION` include, `tasks` fixtures, 12-key/`subtasks: []`, 6-key shape + no-leak assertions
- `courses-meetings-e2e.spec.ts` — `ASSIGNMENT_KEYS` + projected `subtasks: []`

No migrations (D120-1 — the `Task` model/`assignmentId` relation already existed); no Prisma regeneration needed.

## Deviations from the story text

- None material. Notable interpretations recorded as findings I-1 (create
  `orderIndex: null` → omitted, per the D113 null-optional convention), I-4
  (PATCH precedence: ownership gate before the at-least-one check, the SP-114D
  order — foreign id + empty body → 404), and I-6 (an empty *path segment*
  answers with the Express router's 404 before the app layer; the app-level
  empty-id contract is covered in the unit suite).

## Findings/deviations record

Full stable-ID table with dispositions lives in
[checkpoint.md](./checkpoint.md) (I-1…I-8). All eight are **closed/fixed** as
of this record; none are open or blocked. Cross-story impact discovered:
none — the only contract change outside this story's routes is the additive
`subtasks` key in the course-detail projection (D120-5, planned), with forced
key-list updates in five existing spec files (all passing).
