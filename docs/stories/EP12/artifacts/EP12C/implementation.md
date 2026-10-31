# EP12C Implementation Record

**Story:** EP12C — Unify web API clients per domain
**Status:** Implemented — awaiting parent review
**Baseline:** 372bad9

## Commits

- (pending) refactor(web): unify dashboard API clients via entityBaseQuery (EP12C)

## Changed paths

Production:
- apps/web/src/shared/api/rtkBaseQuery.ts (add `entityBaseQuery<Arg, Result>`)
- apps/web/src/features/calendar/api/calendarApi.ts (delegate to `listCalendarEvents`; rewrite D05-8/D404-10 recording comment)
- apps/web/src/features/assignments/api/assignmentsApi.ts (delegate to `listAssignments`; rewrite recording comment)

Tests:
- apps/web/src/features/calendar/api/calendarApi.test.ts (adapter harness; T-12C-2/3)
- apps/web/src/features/assignments/api/assignmentsApi.test.ts (adapter harness; T-12C-1)

Entity modules, callers (DashboardPage, CalendarPage, AssignmentsPage, FinishSessionDialog, FocusAssignmentPanel, StudyHistoryPage), store, test/providers unchanged.

## AC outcomes

- AC-12C-1: calendar slice no longer states `/calendar/events` URL/params; entity module owns them. Grep of executable code in `features/` finds none.
- AC-12C-2: assignments slice delegates to `listAssignments`; URL/whitelist owned by entity module.
- AC-12C-3: `entityBaseQuery<Arg, Result>(fetcher)` added to existing `rtkBaseQuery.ts`; identical error mapping (`{ message, code: String(status) }` from `failure.response?.status`).
- AC-12C-4: only the two feature slices, `rtkBaseQuery.ts`, and their spec files touched.
- AC-12C-5: both RTK slice suites pass (real adapter harness); entity suites unchanged.
- AC-12C-6: T-12C-1 (assignments: delegated path, no query string), T-12C-2 (calendar 400 error shape), T-12C-3 (calendar 404 error shape) added.
- AC-12C-7: test/lint/typecheck/build all exit 0.

## Verification

- pnpm --filter @studypilot/web test: exit 0 (1092 tests)
- pnpm --filter @studypilot/web lint --max-warnings 0: exit 0
- pnpm --filter @studypilot/web typecheck: exit 0
- pnpm --filter @studypilot/web build: exit 0

## Findings/deviations

- RTK slice suites switched from spying on `httpClient.request` to adapter-based capture, because the delegated fetch now routes through the entity client (`api.get` → context.request), which bypasses the instance-level request spy. Error-path tests already used the adapter and remain unchanged in shape.
- `assignmentsApi` test params assertion updated from `toBeUndefined()` to empty-keys check, because the entity client sends an empty params object for the unset case (no query string produced).
- Method casing assertion updated from `'GET'` to `'get'` (axios normalizes to lowercase through the entity client).
- Findings/deviations: None beyond the above test-harness adjustments.