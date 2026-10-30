# EP06B checkpoint

Updated: 2026-10-30 (implementation complete — awaiting parent review)
Execution state: [EP06 README queue](../../README.md#execution-queue) row EP06B — `Implemented — awaiting parent review`
Story: [EP06B-remaining-work-calculation-and-read-api.md](../../EP06B-remaining-work-calculation-and-read-api.md)
Review unit: EP06 combined parent review (`../EP06/review.md` + `../EP06/walkthrough.md`) after EP06H — this child is one of the eight children of that unit
Role / scope: implementer; **backend only** — the pure remaining-work classification, the shared comparator, EP06's own ownership-scoped `StudySession` aggregation (state A) and `GET /study-plans/remaining-work`. Excluded: EP06C (the engine + the conflict rules), EP06D (the plan persistence, the migration, the preview/save/read API and the conflict re-check), EP06G (all frontend), any change to the `StudySession` schema (EP07A's), consuming EP07B's `GET /study-sessions/confirmed-time` (D06-6), writing `Assignment.actualHours` or any denormalized copy of the confirmed time, and any change to `PATCH /users/me`'s preferences bag.
Result record: [implementation.md](./implementation.md)

## Repository state

- Workspace / branch: `/Users/michaelrobert/Desktop/focus-app`, `main`
- Baseline HEAD before changes: `236e460` (EP06A's final confirmation-run note); the plan's own baseline is `9b1ec19`
- Saved work: this child's scoped commits — `f07a84b` (the application code and the tests) and the closeout commit (this checkpoint, the implementation record and the queue/status updates); the closeout commit's hash is returned in the handoff.
- Other work to preserve: `apps/api/tsconfig.json` — pre-existing, unrelated, modified and **unstaged** (it adds `dist-test` to `exclude`). It is not mine: never stage it, never commit it, leave it modified. `docs/stories/EP06/README.md` also carried the **coordinator's** `## Autopilot` section as an uncommitted change before this session; it was left unstaged and only the queue's execution fields were edited (the coordinator's section is untouched and still uncommitted).

## Progress

- [x] Read the repo role rules (`AGENTS.md`), the implementer role file, the implementer + backend skills, `delivery-state.md`, `checkpoint-execution.md` and `context-efficiency.md` (the closeout contract).
- [x] Read the EP06 parent README (the execution queue, the shared API and data contract → *Endpoints*, *Rules* 3–5, the `RemainingWorkItem` payload, *The window, the dates and the time representation*, the decision register D06-1/6/7/17/22/24/25, the code baseline and the invariants) and the EP06B child spec (the eight ACs, the bounded scope, the implementation notes and the DoD).
- [x] Read what EP06A built (`domain/study-planning/{types.ts,preferences.ts}`, `modules/study-plans/*`) and the cited precedents (`common/ownership/ownership.ts`, `modules/calendar/calendar.service.ts:47-66`, `modules/availability/availability.service.ts:35-45`).
- [x] The domain: `types.ts` (the shared types), `remaining-work.ts`, `ordering.ts` — pure, no database, no clock, no zone.
- [x] The domain unit tests: `remaining-work.spec.ts` (21), `ordering.spec.ts` (15).
- [x] The civil-date helper `common/lib/civil-date.ts` (+ its 9-test spec).
- [x] The service read `getRemainingWork` (the two scoped reads, the one civil-date conversion, the classification, the shared comparator's order, the projection), the controller route and the module registration.
- [x] The service unit spec (+9), the data-scoping spec (+4) and the e2e spec (+7).
- [x] Verification: `-- remaining-work` 21/21, `-- ordering` 15/15, `-- study-plans` 3 suites / 56 tests, the whole API suite 56 suites / 1217 tests, `typecheck` exit 0, `lint` exit 0.
- [x] The implementation record, the README queue + the child's `**Status:**`/artifact pointers, the scoped commits.
- Current step: none — EP06B's implementation is complete; do not start EP06C (the coordinator dispatches the next writer).

## Decisions and dependencies

- **The domain stays pure**: `classifyAssignments(assignments, confirmedByAssignment)` reads no database, no clock and no zone; `dueDate` reaches it as the profile zone's **civil date** (`YYYY-MM-DD | null`) and the confirmed minutes arrive as an input `Map`. The service converts the stored instants **once** (D06-24).
- **The comparator** `compareAssignments(a, b, today)` in `domain/study-planning/ordering.ts` is the **one** shared ordering (D06-22); `today` is an **input** (the profile zone's civil today), so the comparator reads no clock. The within-group reading (the due-date key applies to every dated group) is documented in the comparator's JSDoc — see F-B-2.
- **State A (D06-7)**: `StudySession` has no `assignmentId` and no `status` today, so no confirmed minute can be attributed: the student's total is reported as `unattributedConfirmedMinutes` and every item's `confirmedMinutes` is `0`. The **state-B upgrade** is written out as a named change in `getRemainingWork` (seam V-07-3) — it is not a new story and not a blocker.
- **`Assignment.actualHours` is never read** (D07-2): the assignment query's `select` does not name it, and the unit spec asserts the select shape and that the payload never mentions it.
- **Ownership**: the assignment query and the session aggregation both carry the authenticated `userId`; the projection never exposes `userId`; the principal is read with `@CurrentUser()`; a missing principal row is the uniform 404 `Resource not found`.
- **Route**: `GET /study-plans/remaining-work` — a second controller class in the same module (`study-plan.controller.ts`); the sibling `study-plans.controller.ts` owns the `/study-preferences` half (EP06A). `StudyPlansModule` was already registered in `app.module.ts` and `test/test-http.ts`, so no registration change was needed.
- **The status filter lives in the domain**, not in the query: the assignment query carries only `where: { userId }` — one implementation of "unfinished only".
- The **parent README's top `**Status:**` line** is stale (it still reads "No implementation started"), but the delivery state assigns the stale parent status line to the reviewer's passing-review docs sync — the implementer did not touch it (F-B-4).

## Findings

| ID | Requirement / source | Affected paths | Observed issue | Disposition | Owner | Closure evidence |
|---|---|---|---|---|---|---|
| F-B-1 | Child spec note 1 ("the calendar's `zoneDateParts` arithmetic") vs. D06-18 ("EP06 does not change this file") | `apps/api/src/modules/calendar/calendar.service.ts` (read-only), `apps/api/src/common/lib/civil-date.ts` (new) | The calendar's `zoneDateParts` is **module-private** (not exported), so EP06 cannot import it. Importing it would mean editing EP04's calendar service — outside EP06's write boundary (D06-18). | **resolved (interpretation, no behavioural deviation)** — EP06 owns an equivalent civil-date conversion in `apps/api/src/common/lib/civil-date.ts` with the **same** `Intl` arithmetic and the same `UTC` fallback for an unreadable zone, so the plan and the calendar render the same day for the same instant. | implementer | `civil-date.spec.ts` (the midnight-rollover cases), the service spec's civil-date case and the e2e spec's `YYYY-MM-DD` due dates. |
| F-B-2 | The shared contract's ordering sentence vs. the child spec's test list | `apps/api/src/domain/study-planning/ordering.ts` | The parent README states the within-group keys as "priority descending, then `createdAt` ascending, then `id` ascending" (the due-date key is named only for the on-time group), while the child spec's test list says "**due date ascending inside a group**". The two readings differ for the **overdue** group. | **resolved (interpretation, documented)** — every **dated** group is ordered by due date ascending first and then by the three tie-breaks; the undated group falls through to the tie-breaks. The reading is stated in the comparator's JSDoc, so EP06C inherits it unchanged. | implementer | `ordering.spec.ts` ("orders overdue assignments by due date ascending too (the earliest first)"), the service spec's order case and the e2e spec's five-item order assertion. |
| F-B-3 | Test environment | the integration specs | `DATABASE_URL` is unset in this shell → every integration spec self-skips, so the e2e/data-scoping evidence would be vacuous. The machine's local `studypilot` database is up and migrated. | **resolved** — the integration runs supplied `DATABASE_URL=postgresql://michaelrobert@localhost:5432/studypilot` on the command line; no `.env*` file was read. | implementer | the verification table in [implementation.md](./implementation.md#verification) (the integration suites report 56 tests, not the self-skipped count). |
| F-B-4 | The parent README's top `**Status:**` line (observed while reconciling the queue) | `docs/stories/EP06/README.md:6` | The line still reads "EP06A is `Ready` … No implementation started", which EP06A's implementation already made stale. | **recorded — not fixed** — the delivery state assigns the stale **parent status line** to the reviewer's passing-review docs sync; the implementer's narrow exception covers the execution fields, the queue row and the active child's status. | **coordinator / reviewer** (EP06's combined review) | the queue row and the child's `**Status:**` line are accurate; the stale line is recorded in [implementation.md](./implementation.md#findings-and-deviations). |

## Verification

- `pnpm --filter api test -- remaining-work` (cwd `/Users/michaelrobert/Desktop/focus-app`) — **1 suite / 21 tests passed**, exit 0.
- `pnpm --filter api test -- ordering` (same cwd) — **1 suite / 15 tests passed**, exit 0.
- `DATABASE_URL=postgresql://michaelrobert@localhost:5432/studypilot pnpm --filter api test -- study-plans` (same cwd) — **3 suites / 56 tests passed**, exit 0 (the two integration suites **executed**, they did not self-skip).
- `DATABASE_URL=postgresql://michaelrobert@localhost:5432/studypilot pnpm --filter api test` (same cwd) — **56 suites / 1217 tests passed**, exit 0 (the pre-change baseline was 53 suites / 1151 tests).
- `pnpm --filter api typecheck` (same cwd) — exit 0.
- `pnpm --filter api lint` (same cwd) — exit 0, 0 warnings (`--max-warnings 0`); `prettier --check "src/**/*.ts"` is clean.
- All of the above ran at the code commit `f07a84b` with only the unrelated `apps/api/tsconfig.json` and the coordinator's README change in the working tree.

## Resume next

1. None for EP06B — the implementation is complete and committed; the next child (EP06C) is dispatched by the coordinator in a **fresh** implementer context.
2. The next actionable child is **EP06C** — the pure scheduling engine and the conflict rules. Its prerequisites are satisfied: EP06A (`7457a0a`) and EP06B (`f07a84b`) are implemented, so the shared `StudyPreferences` type, the `apps/api/src/domain/study-planning/` module, the **one** comparator (`ordering.ts` → `compareAssignments`) and the schedulable-assignment classification (`remaining-work.ts` → `classifyAssignments`, `types.ts` → `SchedulableAssignment`) all exist and are tested.
- Read next: [implementation.md](./implementation.md) (the completed behavior, the verification, the deviations and the findings) and the EP06B story's *Notes for the next child (EP06C)*; the EP06B story file only if the reviewer raises findings.
