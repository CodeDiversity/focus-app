# EP06B implementation record

**Status:** implementation complete — awaiting parent review (2026-10-30). This child's own review is not a gate: the **combined EP06 parent review** (after EP06H) is.
**Story:** [EP06B — Remaining-Work Calculation & Read API](../../EP06B-remaining-work-calculation-and-read-api.md)
**Parent:** [EP06 — Study Planning & Scheduling](../../README.md) (the execution queue, the shared API/data contract, the decision register)
**Review unit:** EP06 combined parent review — `../EP06/review.md` + `../EP06/walkthrough.md` (after EP06H). EP06B is one of the eight children of that unit.
**Checkpoint:** [checkpoint.md](./checkpoint.md) (the discoveries, the decisions and the resume state)
**Code commit:** `f07a84b` — `feat(api): add the remaining-work calculation and GET /study-plans/remaining-work (EP06B)` (13 files: the application code and the tests). The closeout commit (this record, the checkpoint's final state, the queue/status updates) follows it and is identified in the returned handoff.

## What was built

The backend half of **AC-E06-02** (the remaining estimated work from the assignment estimates and the confirmed study time) and **AC-E06-09** (assignments missing the scheduling information are flagged, not silently scheduled):

| Piece | Where | What it owns |
|---|---|---|
| The remaining-work classification | `apps/api/src/domain/study-planning/remaining-work.ts` | the estimate → minutes conversion (`round(estimatedHours × 60)`), the unfinished-status filter, the flagging matrix (D06-25) and the remaining-work arithmetic (`max(0, estimatedMinutes − confirmedMinutes)`). Pure: no database, no clock, no zone — the confirmed minutes arrive as an input map and the due dates as **civil** dates. |
| The **one** shared comparator | `apps/api/src/domain/study-planning/ordering.ts` | `compareAssignments(a, b, today)` (D06-22) — on-time first (due date ascending), then overdue, then undated; inside a group priority descending, then `createdAt` ascending, then `id` ascending (the last key makes the order total). EP06C imports it. |
| The civil-date conversion | `apps/api/src/common/lib/civil-date.ts` | the instant → civil-date conversion in the profile zone (D06-24) — the same `Intl` arithmetic the calendar service uses. |
| The read | `apps/api/src/modules/study-plans/study-plans.service.ts` + `study-plan.controller.ts` | `GET /study-plans/remaining-work` → `{ items: RemainingWorkItem[]; unattributedConfirmedMinutes: number }`. |

The shared types (`AssignmentStatusValue`, `UnfinishedAssignmentStatus`, `AssignmentPriorityValue`, `RemainingWorkFlag`, `AssignmentFacts`, `ClassifiedAssignment`, `SchedulableAssignment`, `FlaggedAssignment`) were added to `apps/api/src/domain/study-planning/types.ts`, the module's shared type home (its header names EP06B as the owner of `SchedulableAssignment`).

### The two-state confirmed-time aggregation (D06-7, seam V-07-3)

**State A (today's schema — implemented):** `StudySession` has no `assignmentId` and no `status`, so a confirmed minute cannot be attributed to an assignment. EP06 sums the student's own sessions (`durationMinutes`) into `unattributedConfirmedMinutes` and attributes **none** of them: every item's `confirmedMinutes` is `0` and `remainingMinutes = estimatedMinutes`. This is unobservable in practice — **nothing writes `StudySession` today** (no API creates one; the only writes in the repo are the calendar test fixtures).

**State B (the named upgrade, when EP07A's migration lands — recorded in the service, not a new story, not a blocker):** the aggregation's `select` becomes `{ id, durationMinutes, assignmentId, status }`; only `status === 'COMPLETED'` sessions count as confirmed time; the rows are grouped by `assignmentId` into the `confirmedByAssignment` map; a row with a null `assignmentId` (including one whose assignment was deleted — EP07A uses `onDelete: SetNull`) stays in `unattributedConfirmedMinutes`. The exact change is written out in the service's own comment block, so the upgrade is mechanical and local to `getRemainingWork`.

`Assignment.actualHours` and `Task.actualMinutes` are **never read** (D07-2, AC 4): the assignment query's `select` does not name `actualHours`, and the unit spec asserts the select shape and that the string `actualHours` never appears in the payload. No denormalized copy of the confirmed time is written anywhere.

## Acceptance criteria — outcome

| AC | Outcome | Evidence |
|---|---|---|
| **1** — one item per **unfinished** assignment (`PENDING`/`IN_PROGRESS`); `COMPLETED`/`SUBMITTED`/`GRADED` absent; each item carries the id, title, course code, the profile zone's civil due date, `estimatedMinutes`, `confirmedMinutes`, `remainingMinutes`, status and the `flagged` reason | **Met.** The status filter is the domain's (`classifyAssignments`); the projection carries exactly the nine contract keys. | `remaining-work.spec.ts` (the status filter), `study-plans.service.spec.ts` ("builds one item per unfinished assignment with exactly the contract keys"), `study-plans-e2e.spec.ts` ("lists only the unfinished assignments, with the contract keys" — over a seeded mix of five statuses). |
| **2** — `estimatedMinutes = round(estimatedHours × 60)`; `remainingMinutes = max(0, estimatedMinutes − confirmedMinutes)`; no estimate → both `null`; no due date → the estimate and the remaining minutes survive | **Met.** | `remaining-work.spec.ts` (the conversion, the rounding, the arithmetic, the `confirmed > estimate → 0` case, the missing-due-date case), `study-plans.service.spec.ts` (the same through the service), `study-plans-e2e.spec.ts` ("reports the estimate, the confirmed minutes and what is left" — 2.5 h → 150 minutes). |
| **3** — the flagging (`MISSING_ESTIMATE` / `MISSING_DUE_DATE`), the precedence and "never a scheduling candidate" | **Met.** A flagged assignment is returned in the domain's `flagged` list, never in `schedulable` (the list EP06C's engine consumes). | `remaining-work.spec.ts` (the whole flagging matrix, including `MISSING_ESTIMATE` winning), `study-plans.service.spec.ts` (both flags through the service), `study-plans-e2e.spec.ts` ("flags the assignments that are missing the estimate or the due date"). |
| **4** — the confirmed minutes come from the `StudySession` log through EP06's own ownership-scoped aggregation; `actualHours` is never read; no denormalized copy is written | **Met.** The service owns the `studySession.findMany({ where: { userId }, select: { id, durationMinutes } })` read; the assignment query's `select` omits `actualHours`. | `study-plans.service.spec.ts` ("scopes both reads to the authenticated student", "never selects or reads Assignment.actualHours"), `study-plans-data-scoping.spec.ts` (the cross-student isolation), the state's own comment (the state-B upgrade). |
| **5** — the response carries `unattributedConfirmedMinutes`; in state A that is the student's entire confirmed total and every item's `confirmedMinutes` is `0`; the number is reported, not hidden | **Met.** | `study-plans.service.spec.ts` ("reports the confirmed minutes as unattributed and attributes none (state A, D06-7)" — 45 + 30 → 75), `study-plans-e2e.spec.ts` ("reports the confirmed minutes as unattributed (state A, D06-7)" — a seeded 45-minute session → 45). |
| **6** — the read is ownership-scoped; a second student's sessions are invisible; the projection never exposes `userId`; an unauthenticated request is rejected | **Met.** Both queries carry the authenticated `userId`; the projection has no `userId` key; the 401 comes from the global JWT guard. | `study-plans-data-scoping.spec.ts` ("each student sees only their own assignments", "a second student's session cannot inflate this student's unattributed total", "the projection never exposes userId", "no token → 401"), `study-plans.service.spec.ts` ("never exposes userId in the payload"). |
| **7** — the items are ordered by the engine's comparator: on-time first (due date ascending), then overdue, then undated; inside a group priority descending, `createdAt` ascending, `id` ascending | **Met.** The service sorts the merged list with `compareAssignments` and the profile zone's civil `today`; the comparator is the one EP06C imports. | `ordering.spec.ts` (the group order, the due-date key, the three tie-breaks, the total order), `study-plans.service.spec.ts` ("orders the items with the shared comparator"), `study-plans-e2e.spec.ts` ("orders the items with the shared comparator (D06-22)" — the full five-item fixture). |
| **8** — unit, data-scoping and e2e specs cover the status filter, the estimate conversion, the confirmed-minutes subtraction, the flagging matrix, the unattributed total, the ordering (including the overdue-last and the `createdAt` tie-break), the civil-date conversion, the ownership scoping and the uniform 401/404 behaviour | **Met.** See the verification table and the AC rows above. The uniform **404** is covered at the service level ("404s uniformly when the principal's row no longer exists" — the identical `Resource not found`, never a 403). It is not reachable over HTTP: the global JWT guard looks the principal up in the database and answers **401** for a vanished row before the route runs — the same behaviour EP06A's routes have. | the four spec files below. |

## Verification

All commands were run from the repository root `/Users/michaelrobert/Desktop/focus-app` at the code commit `f07a84b` (the working tree carried only the pre-existing unrelated `apps/api/tsconfig.json` and the coordinator's `docs/stories/EP06/README.md` change — neither is part of this child).

| Command | cwd | Result | Tested state |
|---|---|---|---|
| `pnpm --filter api test -- study-plans` | `/Users/michaelrobert/Desktop/focus-app` | **3 suites / 56 tests passed**, exit 0 | the unit, data-scoping and e2e specs. `DATABASE_URL=postgresql://michaelrobert@localhost:5432/studypilot` was supplied on the command line, so the two integration suites **executed** against the real local database instead of self-skipping. |
| `pnpm --filter api test -- remaining-work` | `/Users/michaelrobert/Desktop/focus-app` | **1 suite / 21 tests passed**, exit 0 | the domain unit tests (no database needed). |
| `pnpm --filter api test -- ordering` | `/Users/michaelrobert/Desktop/focus-app` | **1 suite / 15 tests passed**, exit 0 | the comparator's unit tests. |
| `pnpm --filter api test` | `/Users/michaelrobert/Desktop/focus-app` | **56 suites / 1217 tests passed**, exit 0 | the **whole** API suite with `DATABASE_URL=postgresql://michaelrobert@localhost:5432/studypilot` (the baseline before this child was 53 suites / 1151 tests; EP06A's and the users module's specs stay green). |
| `pnpm --filter api typecheck` | `/Users/michaelrobert/Desktop/focus-app` | **exit 0** (`tsc --noEmit`, no output) | the committed tree. |
| `pnpm --filter api lint` | `/Users/michaelrobert/Desktop/focus-app` | **exit 0** (`eslint --max-warnings 0`, no output, no file rewritten) | the committed tree. |

No `.env`/`.env.*` file was read at any point; the database URL was supplied on the command line, as the previous implementer did. `prettier --check "src/**/*.ts"` is clean.

## Changed paths

**Application code**

- `apps/api/src/domain/study-planning/types.ts` (modified) — the shared types EP06B adds.
- `apps/api/src/domain/study-planning/remaining-work.ts` (new) — the pure classification.
- `apps/api/src/domain/study-planning/ordering.ts` (new) — the one shared comparator.
- `apps/api/src/common/lib/civil-date.ts` (new) — the instant → civil-date conversion in the profile zone.
- `apps/api/src/modules/study-plans/study-plans.service.ts` (modified) — `getRemainingWork`, the `RemainingWorkItem` / `RemainingWorkResponse` types and the projection.
- `apps/api/src/modules/study-plans/study-plan.controller.ts` (new) — `@Controller('study-plans')`, `GET /study-plans/remaining-work`.
- `apps/api/src/modules/study-plans/study-plans.module.ts` (modified) — the new controller registered.

**Tests**

- `apps/api/src/domain/study-planning/remaining-work.spec.ts` (new, 21 tests).
- `apps/api/src/domain/study-planning/ordering.spec.ts` (new, 15 tests).
- `apps/api/src/common/lib/civil-date.spec.ts` (new, 9 tests).
- `apps/api/src/modules/study-plans/study-plans.service.spec.ts` (modified, +9 tests).
- `apps/api/src/modules/study-plans/study-plans-data-scoping.spec.ts` (modified, +4 tests).
- `apps/api/src/modules/study-plans/study-plans-e2e.spec.ts` (modified, +7 tests).

**Artifacts (the closeout commit)**

- `docs/stories/EP06/artifacts/EP06B/checkpoint.md` (new).
- `docs/stories/EP06/artifacts/EP06B/implementation.md` (new — this file).
- `docs/stories/EP06/README.md` (modified — the execution queue's EP06B and EP06C rows, `Active substory`, `Next substory` only).
- `docs/stories/EP06/EP06B-remaining-work-calculation-and-read-api.md` (modified — the `**Status:**` line and the artifact pointers only).

**Not touched:** `apps/api/tsconfig.json` (a pre-existing, unrelated dirty path — left modified and unstaged), the `## Autopilot` section of the parent README (the coordinator's), the epic file, the decision register, the acceptance criteria, the AC/TR traceability, the shared contract, the correction log and the reviewer's `plan-review.md`.

## Commit scope

- `f07a84b` — `feat(api): add the remaining-work calculation and GET /study-plans/remaining-work (EP06B)`: the 13 application-code and test files listed above. The pre-commit hook (`lint-staged` → eslint + prettier) ran on the staged files only; the unrelated dirty paths stayed unstaged and unmodified.
- The closeout commit (this record, the final checkpoint, the queue/status updates and the child's status line) — its hash is returned in the handoff (a commit's own hash is not written into its own record).

## Deviations

1. **The civil-date conversion is EP06's own copy, not the calendar's function.** The child spec's implementation note 1 says the service converts the stored `DateTime` "with the calendar's `zoneDateParts` arithmetic". The calendar's `zoneDateParts` is **module-private** (`apps/api/src/modules/calendar/calendar.service.ts:47-66` — it is not exported), and importing it would mean editing EP04's calendar service, which the plan explicitly excludes ("EP06 does not change this file", D06-18). EP06 therefore owns an equivalent conversion in `apps/api/src/common/lib/civil-date.ts` — the same `Intl.DateTimeFormat('en-CA', …)` arithmetic with two-digit parts, the same `UTC` fallback for an unreadable zone as the calendar's own `isValidTimeZone` rule (`calendar.service.ts:186`) — so the plan and the calendar render the same day for the same instant. The duplication is recorded (F-B-1), not created silently. *Behavioural impact: none.*
2. **The endpoint's controller is a second class in the module.** The module's existing controller owns the top-level `/study-preferences` half (EP06A); `GET /study-plans/remaining-work` needs the `/study-plans` prefix, so EP06B adds `StudyPlanController` (`study-plan.controller.ts`) beside it, and `StudyPlansModule` registers both. EP06D adds the plan preview/save/read to that same controller. *Behavioural impact: none — the route paths are exactly the contract's.*
3. **The status filter runs in the domain, not in the query.** The assignment query carries only `where: { userId }`; "unfinished only" is the domain's rule (one implementation, unit-tested). *Behavioural impact: the query transfers the student's finished assignments too; the payload and the rules are unchanged.*

## Findings and dispositions

| ID | Requirement / source | Affected paths | Observed issue | Disposition | Owner | Closure evidence |
|---|---|---|---|---|---|---|
| F-B-1 | The child spec's implementation note 1 (the calendar's `zoneDateParts`) vs. D06-18 ("EP06 does not change this file") | `apps/api/src/modules/calendar/calendar.service.ts` (read-only), `apps/api/src/common/lib/civil-date.ts` (new) | The calendar's civil-date conversion is module-private, so EP06 cannot import it; importing it would edit EP04's file. | **resolved (interpretation, no behavioural deviation)** — EP06 owns an equivalent conversion with the same `Intl` arithmetic and the same `UTC` fallback; the duplication is recorded in *Deviations* 1. | implementer | `civil-date.spec.ts` (the midnight-rollover cases) + `study-plans.service.spec.ts` ("converts the stored due date to the profile zone's civil date") + the e2e spec's `YYYY-MM-DD` due dates. |
| F-B-2 | The shared contract's ordering sentence vs. the child spec's test list | `apps/api/src/domain/study-planning/ordering.ts` | The parent README states the within-group keys as "priority descending, then `createdAt` ascending, then `id` ascending" (the due-date key is named only for the on-time group), while the child spec's test list says "**due date ascending inside a group**". The two readings differ for the **overdue** group. | **resolved (interpretation, documented)** — the comparator orders every **dated** group by due date ascending first and then by the three tie-breaks; the undated group falls through to the tie-breaks. The reading is stated in the comparator's JSDoc, so EP06C inherits it unchanged. | implementer | `ordering.spec.ts` ("orders overdue assignments by due date ascending too (the earliest first)") + the service and e2e ordering assertions. |
| F-B-3 | The test environment (`DATABASE_URL` unset in the shell) | the integration specs | Without `DATABASE_URL` every integration spec self-skips, so the e2e/data-scoping evidence would be vacuous. The machine's local `studypilot` database is up and migrated. | **resolved** — the integration runs supplied `DATABASE_URL=postgresql://michaelrobert@localhost:5432/studypilot` on the command line; no `.env*` file was read. | implementer | the verification table above (the integration suites report 56 tests, not the self-skipped count). |
| F-B-4 | The parent README's top `**Status:**` line (observed while reconciling the queue) | `docs/stories/EP06/README.md:6` | The line still reads "EP06A is `Ready` … No implementation started", which EP06A's implementation already made stale. | **recorded — not fixed** (the delivery state assigns the stale **parent status line** to the reviewer's passing-review docs sync; the implementer's narrow exception covers the execution fields, the queue row and the active child's status). | **coordinator / reviewer** (EP06's combined review) | this record's note; the queue row and the child's `**Status:**` line are accurate. |

**Findings/deviations:** the three deviations above (the civil-date helper, the second controller, the status filter in the domain) and the four findings F-B-1…F-B-4. No finding is open inside EP06B's scope: F-B-1 and F-B-2 are resolved in code and documented, F-B-3 is a verification condition, and F-B-4 is outside the implementer's write boundary.

## Notes for the next child (EP06C)

- `compareAssignments(a, b, today)` (`apps/api/src/domain/study-planning/ordering.ts`) is the comparator to import; `today` is the caller's **civil** date in the profile zone (an input — the comparator reads no clock).
- `classifyAssignments(assignments, confirmedByAssignment)` returns `{ schedulable, flagged }`; the engine consumes **`schedulable`** only (a flagged assignment is never a candidate). `SchedulableAssignment` (in `domain/study-planning/types.ts`) is the engine's assignment type: it carries the **civil** `dueDate`, `estimatedMinutes`, `remainingMinutes`, `confirmedMinutes`, `priority` and `createdAt`.
- The `dueDate` the engine receives is already the profile zone's civil date — the service converts once (D06-24).
- `toCivilDate(instant, timeZone)` (`apps/api/src/common/lib/civil-date.ts`) is the conversion EP06D needs for the window and for the read-back; it never throws and falls back to `UTC` for an unreadable zone.
- The state-B aggregation upgrade (seam V-07-3) is written out in `getRemainingWork` and touches no other file.
