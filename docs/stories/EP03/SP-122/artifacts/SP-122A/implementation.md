# SP-122A implementation record

## Summary
Implemented `GET /assignments` backend list endpoint with filters, search, sort, ownership gate, and contract projection.

## Changed paths
- `apps/api/src/modules/assignments/dto/list-assignments-query.dto.ts` (new)
- `apps/api/src/modules/assignments/assignments.service.ts` (`list()`)
- `apps/api/src/modules/assignments/assignments.controller.ts` (`@Get()` handler)
- `apps/api/src/modules/assignments/assignments.service.spec.ts` (list tests)

## Acceptance criteria outcomes
1. List: implemented; returns array; empty `[]`.
2. Course filter: implemented; foreign/missing/malformed → 404 via course gate.
3. Status filter: implemented; invalid → 400.
4. Priority/type filters: implemented; invalid → 400.
5. Date range: inclusive bounds; null dueDate excluded when bound present.
6. Search: case-insensitive contains on title+description; trimmed; empty→absent; max 200.
7. Sort: supported enums; default dueDate asc (nulls last), title asc, id asc; tie-break title asc then id asc.
8. Ownership: all queries scoped by userId; userId param → 400 unknown.
9. Unknown params → 400.
10. Auth → 401 global guard.
11. Projection: 11 keys + course + subtasks (6 keys, ordered).
12. No regression: POST/PATCH/DELETE/subtasks/course detail untouched.

## Verification
- `pnpm --filter @studypilot/api exec tsc --noEmit`: pass.
- `pnpm --filter @studypilot/api exec jest --runInBand assignments.service.spec.ts`: 246 passed.
- Integration `_tmp` spec (with DB): 9 passed (removed after verification).
- `assignments-data-scoping.spec.ts`: 74 passed (existing; DB available).

## Findings/deviations
None.

## Commit
`b88b1dbacd67b9279d89022075efa2214fdfcdc3` — feat(api): SP-122A GET /assignments with filters, search, sort.
EOF
echo done