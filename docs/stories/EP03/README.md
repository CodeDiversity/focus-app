# EP03 Story Breakdown — Assignment & Task Management

**Epic:** [EP03: Assignment & Task Management](../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1 (functional academic tracker)
**Epic dependency:** EP02 (Semester & Course Management) — **complete 2026-10-23** (implemented + reviewed; queue at [docs/stories/EP02](../EP02/README.md#execution-queue)). EP03 implementation is **not blocked**.
**Status:** Story 1 (quick assignment creation) → [SP-113](./SP-113/README.md) — planned 2026-10-24, **Plan Ready**. Stories 2–7 not yet broken down (planned later, in order). User scope (2026-10-23): **story 1 only**.

## Code baseline (2026-10-24)

- `Assignment` model **exists** in `apps/api/prisma/schema.prisma` (id, `userId` cascade, `courseId?` nullable, title, description?, **`dueDate DateTime` required**, estimatedHours?, actualHours?, `status` @default(PENDING), `priority` @default(MEDIUM), timestamps, `tasks Task[]`, `@@map("assignments")`) — created with the EP01-era schema, but **no assignments API module exists** (verified: `apps/api/src/modules/` = auth, courses, email, onboarding, prisma, semesters, users).
- Enums exist: `AssignmentStatus` (PENDING/IN_PROGRESS/COMPLETED/SUBMITTED/GRADED), `AssignmentPriority` (LOW/MEDIUM/HIGH/URGENT).
- **No prisma seed file** (`apps/api/prisma/` = migrations + schema only) — no user-created assignment rows exist; the course-detail assignments projection is always empty until EP03.
- `Task` model exists (optional `assignmentId` relation, **nullable** `dueDate`, minute-based durations, status/priority) — the subtask-vs-`Task` question is deferred to proposed story 4.
- Frontend: `shared/types/academic.ts` has the `Assignment` type (`dueDate: string` non-null) + `CourseAssignment = Omit<Assignment, 'course'>` (SP-112). The course detail page (`pages/courses/ui/CourseDetailPage.tsx`) renders the read-only `AssignmentsSection` (`features/courses/ui/`) from the single `getCourse` fetch (D112B-13); empty state "No assignments yet." with no CTA (SP-112B). No assignments entity/feature folders exist yet.
- The course-detail refetch pattern (D112B-10): sections take an `onXxxChanged` callback; the page re-runs `getCourse` in the background. SP-113B follows it.
- The frontend HTTP pattern is plain axios (`@/shared/api/httpClient` + token interceptor — no RTK Query, per `entities/course/api/courseApi.ts`); `<Toaster />` is mounted in `main.tsx` (F-112B-1).

## Stories

| Story | Epic proposed story | Breakdown | Jira |
|---|---|---|---|
| [SP-113](./SP-113/README.md) | 1. Implement quick assignment creation | [3 children](./SP-113/README.md) (A backend, B frontend, C integration) — planned 2026-10-24, **Plan Ready** | Pending creation |
| — | 2. Implement assignment editing and deletion | Not yet broken down (planned later) | — |
| — | 3. Add assignment types, deadlines, and priority | Not yet broken down (planned later) | — |
| — | 4. Implement assignment subtasks | Not yet broken down (planned later) | — |
| — | 5. Implement completion and status tracking | Not yet broken down (planned later) | — |
| — | 6. Implement assignment search, sorting, and filters | Not yet broken down (planned later) | — |
| — | 7. Implement overdue and completed assignment views | Not yet broken down (planned later) | — |

Anticipated IDs SP-114…SP-119 are provisional until those stories are broken
down; IDs may shift if a proposed story splits. Story 3's anticipated scope is
the `type` column (the remainder of AC-E03-02) — the exact split settles when
it is broken down.

## Epic acceptance criteria — ownership

| Epic AC (original wording) | Stable ID | Owner |
|---|---|---|
| Students can create an assignment with a title and course. | AC-E03-01 | **SP-113** A/B/C. |
| Optional fields include due date, estimated duration, type, and priority. | AC-E03-02 | **SP-113** (due date, estimated duration, priority) + story 3 (the `type` column — TBD, not yet broken down). |
| Assignments can contain ordered, independently completable subtasks. | AC-E03-03 | Story 4 (TBD). |
| Students can update assignment status. | AC-E03-04 | Story 5 (TBD). |
| Completing an assignment removes it from unfinished-work views without deleting it. | AC-E03-05 | Stories 5 + 7 (TBD). |
| Overdue work is identified from the deadline and completion status. | AC-E03-06 | Story 7 (TBD). |
| Assignment lists support course, date, and status filtering. | AC-E03-07 | Story 6 (TBD). |

The epic defines no test requirements; story-level test obligations are owned
per child in the [SP-113](./SP-113/README.md) breakdown.

## Execution queue

The next EP03 delivery home is [SP-113](./SP-113/README.md#execution-queue)
(quick assignment creation): next actionable **SP-113A** (implement) — no
blockers (EP02 complete 2026-10-23). After SP-113A, **SP-113B needs a
`ui-refiner` pass** before implementation (UI/UX gaps recorded in its ticket,
2026-10-24).

## Quality gate — SP-113 plan (2026-10-24)

**Plan Ready** — D113-1 (nullable `dueDate` migration) is the only
persisted-data change and is forced by the epic AC-2 (due date optional) —
the only compliant resolution, recorded with provenance; D113-2…6
planner-recorded (grounded, reversible). Implementation not blocked (EP02
complete 2026-10-23). Full gate table:
[SP-113 README](./SP-113/README.md#quality-gate-2026-10-24). No Jira sync was
authorized for this planning task; all SP-113 keys are `Pending creation`.
