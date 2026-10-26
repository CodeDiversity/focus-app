# SP-122B implementation record

## Summary
Implemented the frontend `/assignments` list page consuming `GET /assignments`, with search, course/date/status/priority/type filters, sort/order, course context and subtask progress per row, loading/empty/error states, responsive layout, and accessibility. Added `listAssignments` + types and the route/nav entry.

## Changed paths
- `apps/web/src/shared/types/academic.ts` (`AssignmentListItem`, `AssignmentListItemCourse`)
- `apps/web/src/entities/assignment/api/assignmentApi.ts` (`listAssignments`, `ListAssignmentsParams`)
- `apps/web/src/entities/assignment/api/assignmentApi.test.ts` (listAssignments tests)
- `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` (new)
- `apps/web/src/pages/assignments/ui/AssignmentsPage.test.tsx` (new)
- `apps/web/src/app/App.tsx` (route)
- `apps/web/src/widgets/header/ui/Header.tsx` (nav entry)
- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` (export badge constants)

## Acceptance criteria outcomes
1. Route: `/assignments` inside ProtectedRoute + Layout, heading "Assignments", nav link between Courses and Profile — implemented.
2. List: calls `listAssignments()` on load, renders rows in API order with title, due date, status, priority, type, course context, subtask progress — implemented.
3. Search: aria-label, maxLength 200, placeholder, 300 ms debounce (flush on Enter), inline clear — implemented.
4. Course filter: Select from listCourses + "All courses"; foreign/missing surfaces 404 as toast + reset — implemented.
5. Date filter: native date inputs → ISO datetimes (`T00:00:00` / `T23:59:59`); empty omits — implemented.
6. Status/priority/type filters: Selects; "All" omits — implemented.
7. Sort: Select + asc/desc toggle with accessible name — implemented.
8. States: initial spinner; re-query keeps list + spinner + aria-busy; empty variants; error card + retry; failed re-query toast; foreign course toast+reset — implemented.
9. Accessibility: semantic ul/li; text+color badges; always-present role="status" live region; focus; toggle name — implemented.
10. Responsive: stacking/wrapping per D122B-8; touch targets ≥ 44 px — implemented.
11. No regression: no backend/migration change; existing assignment controls untouched — implemented.

## Verification
- `npm run typecheck` (web): pass.
- `npx vitest run src/pages/assignments/ui/AssignmentsPage.test.tsx src/entities/assignment/api/assignmentApi.test.ts`: 29 tests passed.
- `npx vitest run src/features/courses/ui/AssignmentsSection.test.tsx`: 29 tests passed.
- Lint: pass after format.

## Findings/deviations
None.

## Commit
`d174526` — feat(web): SP-122B assignments list page with search, filters, sort.
EOF
echo done