# EP06G checkpoint
Updated: 2026-10-30
Execution state: EP06G — Implemented — awaiting parent review (see parent README queue row)
Story: docs/stories/EP06/EP06G-remaining-work-and-deficit-warnings-ui.md
Review unit: EP06 combined parent review — ../EP06/review.md + ../EP06/walkthrough.md (after EP06H)
Role / scope: implementer; frontend remaining-work list + deficit warnings on /plan. Excludes backend, preview/edit/save (EP06F), preferences (EP06E).

## Repository state
- Workspace / branch: /Users/michaelrobert/Desktop/focus-app, main
- HEAD at last update: c3ce7e0
- Saved work: implementation complete; commits recorded in implementation.md
- Other work to preserve: apps/api/tsconfig.json (pre-existing unrelated dirty, unstaged)

## Progress
- [x] Entity client `listRemainingWork` + types (RemainingWorkItem/Response/Flag, PlanWarning/PlanDeferred)
- [x] `formatMinutes` helper
- [x] `RemainingWorkSection` (loading/empty/error/data, skeleton, summary, flagged marker)
- [x] `WorkloadWarnings` (three categories, deferred list, empty/error states)
- [x] Mount both sections in PlanPage (remaining above week, warnings below)
- [x] Tests: RemainingWorkSection, WorkloadWarnings, PlanPage mock update
- [x] Verification: typecheck, lint, format, focused tests green
- Current step: closeout (implementation.md, queue/status, commit)

## Decisions and dependencies
- UI/UX spec and Decisions subsection in story file are settled; followed verbatim.
- WorkloadWarnings distinguishes before-preview vs after-preview via undefined warnings/deferred.
- Deferred title falls back to assignmentId when no title supplied (contract has none).

## Verification
- pnpm --filter web typecheck: exit 0
- pnpm --filter web lint: exit 0
- pnpm --filter web format: clean
- pnpm --filter web test -- RemainingWork: 12 passed
- pnpm --filter web test -- WorkloadWarnings: 7 passed
- pnpm --filter web test -- PlanPage: 7 passed
- pnpm --filter web test (full): 1022/1024, 2 CourseForm timeouts under full-suite load (pass in isolation)

## Resume next
1. Write implementation.md and update queue/status.
2. Commit scoped code + artifacts.
3. Return handoff.