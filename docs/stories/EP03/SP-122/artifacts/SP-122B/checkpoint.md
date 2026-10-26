# SP-122B checkpoint

- Story: SP-122B (frontend `/assignments` list page)
- Status: Implemented — awaiting parent review
- Baseline: 40a3b17
- Started: 2026-10-26

## Scope
Implement `listAssignments` + types; `AssignmentsPage`; route + nav; component + entity tests.

## Findings
None.

## Progress
- [x] `AssignmentListItem` / `AssignmentListItemCourse` in `shared/types/academic.ts`
- [x] `listAssignments` + `ListAssignmentsParams` in `entities/assignment/api/assignmentApi.ts`
- [x] `AssignmentsPage` created
- [x] Route `/assignments` in `App.tsx`
- [x] Header nav entry
- [x] Badge constants exported from `AssignmentsSection`
- [x] Component tests (12)
- [x] Entity API tests (listAssignments cases)
- [x] Typecheck + tests pass
- [x] Docs + commit
