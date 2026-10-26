# EP03 Story Breakdown — Assignment & Task Management

**Epic:** [EP03: Assignment & Task Management](../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1 (functional academic tracker)
**Epic dependency:** EP02 (Semester & Course Management) — **complete 2026-10-23** (implemented + reviewed; queue at [docs/stories/EP02](../EP02/README.md#execution-queue)). EP03 implementation is **not blocked**.
**Status:** Stories 1–3 are reviewed (SP-113 and SP-114, 2026-10-24; SP-115, 2026-10-25 — [review](./SP-115/artifacts/SP-115/review.md) · [walkthrough](./SP-115/artifacts/SP-115/walkthrough.md)). Story 4 → [SP-120](./SP-120/README.md) — **implemented 2026-10-25** (I and J); the combined review returned **changes required** 2026-10-25 (IR-120-1/2 — execution evidence only, no code defect; report at [SP-120 review](./SP-120/artifacts/SP-120/review.md), uncommitted). Story 5 → [SP-121](./SP-121/README.md) — **Plan Ready 2026-10-26** (A backend `Ready`, B frontend `Needs refinement` for ui-refiner). Stories 6–7 are not broken down. User scope (2026-10-25): story 3 — complete; story 4 — plan. User direction (2026-10-26): story 5 — plan; SP-121 children lettered from A and executed in alphabetical order A → B (D121-6).

## Code baseline (2026-10-24)

- `Assignment` model **exists** in `apps/api/prisma/schema.prisma` (id, `userId` cascade, `courseId?` nullable, title, description?, **`dueDate DateTime` required**, estimatedHours?, actualHours?, `status` @default(PENDING), `priority` @default(MEDIUM), timestamps, `tasks Task[]`, `@@map("assignments")`) — created with the EP01-era schema, but **no assignments API module exists** (verified: `apps/api/src/modules/` = auth, courses, email, onboarding, prisma, semesters, users).
- Enums exist: `AssignmentStatus` (PENDING/IN_PROGRESS/COMPLETED/SUBMITTED/GRADED), `AssignmentPriority` (LOW/MEDIUM/HIGH/URGENT).
- **No prisma seed file** (`apps/api/prisma/` = migrations + schema only) — no user-created assignment rows exist; the course-detail assignments projection is always empty until EP03.
- `Task` model exists (optional `assignmentId` relation, **nullable** `dueDate`, minute-based durations, status/priority) — the subtask-vs-`Task` question is deferred to proposed story 4.
- Frontend: `shared/types/academic.ts` has the `Assignment` type (`dueDate: string` non-null) + `CourseAssignment = Omit<Assignment, 'course'>` (SP-112). The course detail page (`pages/courses/ui/CourseDetailPage.tsx`) renders the read-only `AssignmentsSection` (`features/courses/ui/`) from the single `getCourse` fetch (D112B-13); empty state "No assignments yet." with no CTA (SP-112B). No assignments entity/feature folders exist yet.
- The course-detail refetch pattern (D112B-10): sections take an `onXxxChanged` callback; the page re-runs `getCourse` in the background. SP-113B follows it.
- The frontend HTTP pattern is plain axios (`@/shared/api/httpClient` + token interceptor — no RTK Query, per `entities/course/api/courseApi.ts`); `<Toaster />` is mounted in `main.tsx` (F-112B-1).

The 2026-10-24 bullets above are the SP-113 planning baseline. They are not the current tree. As of 2026-10-25: `dueDate` is nullable; `apps/api/src/modules/assignments/` exists (`POST`, `PATCH`, `DELETE`); `entities/assignment/` exists; the course-detail section can create, edit, and delete. There is still no `type` column. Use the [SP-115 baseline](./SP-115/README.md#code-baseline-2026-10-25) for story 3.

## Stories

| Story | Epic proposed story | Breakdown | Jira |
|---|---|---|---|
| [SP-113](./SP-113/README.md) | 1. Implement quick assignment creation | [3 children](./SP-113/README.md) (A backend, B frontend, C integration) — reviewed 2026-10-24 | Pending creation |
| [SP-114](./SP-114/README.md) | 2. Implement assignment editing and deletion | [3 children](./SP-114/README.md) (D backend, E frontend, F integration) — reviewed 2026-10-24 | Pending creation |
| [SP-115](./SP-115/README.md) | 3. Add assignment types, deadlines, and priority | [2 children](./SP-115/README.md) (G backend, H frontend) — **Reviewed 2026-10-25**. Deadlines and priority shipped in SP-113; this parent owned the `type` column. | Pending creation |
| [SP-120](./SP-120/README.md) | 4. Implement assignment subtasks | [2 children](./SP-120/README.md) (I backend, J frontend) — **implemented 2026-10-25**; combined review changes-required (IR-120-1/2, no code defect). Uses the existing `Task` model as subtasks (D120-1 — no migration). | Pending creation |
| [SP-121](./SP-121/README.md) | 5. Implement completion and status tracking | [2 children](./SP-121/README.md) (A backend, B frontend) — **Plan Ready 2026-10-26**. A is `Ready`; B is `Needs refinement` (ui-refiner). Children lettered from A per user direction 2026-10-26 (D121-6). | Pending creation |
| — | 6. Implement assignment search, sorting, and filters | Not yet broken down (planned later) | — |
| — | 7. Implement overdue and completed assignment views | Not yet broken down (planned later) | — |

Anticipated IDs for stories 6–7 are SP-122…SP-123 until those stories are
broken down. (SP-116…SP-119 were consumed by EP09's E2E automation:
SP-116/117/118 implemented, SP-119 the dedicated-test-database infra story.)
IDs may shift if a proposed story splits.

## Epic acceptance criteria — ownership

| Epic AC (original wording) | Stable ID | Owner |
|---|---|---|
| Students can create an assignment with a title and course. | AC-E03-01 | **SP-113** A/B/C. |
| Optional fields include due date, estimated duration, type, and priority. | AC-E03-02 | **SP-113** (due date, estimated duration, priority) + **SP-115** (the `type` column — G API, H UI). |
| Assignments can contain ordered, independently completable subtasks. | AC-E03-03 | **SP-120** I (API) / J (UI). |
| Students can update assignment status. | AC-E03-04 | **SP-121** A (API) / B (UI). |
| Completing an assignment removes it from unfinished-work views without deleting it. | AC-E03-05 | **SP-121** A (transition is a PATCH — no delete) + B (unfinished-only default view) + story 7 (TBD — completed/overdue views). |
| Overdue work is identified from the deadline and completion status. | AC-E03-06 | Story 7 (TBD). |
| Assignment lists support course, date, and status filtering. | AC-E03-07 | Story 6 (TBD). |

The epic defines no test requirements. Story-level test obligations are owned
per child in the [SP-113](./SP-113/README.md), [SP-114](./SP-114/README.md),
[SP-115](./SP-115/README.md), [SP-120](./SP-120/README.md), and
[SP-121](./SP-121/README.md) breakdowns.

## Execution queue

SP-113 and SP-114 are reviewed (2026-10-24). Their queues have no next
substory. Do not restart them.

SP-115 is reviewed (2026-10-25 — [review](./SP-115/artifacts/SP-115/review.md)
· [walkthrough](./SP-115/artifacts/SP-115/walkthrough.md)). Its queue's next
substory is None with reason: the review unit is complete.

SP-120 is **implemented** (2026-10-25 — I `5e65cfc`, J `a1ec584`; [breakdown](./SP-120/README.md)).
Its queue's next substory is None — the final parent review is next. The
combined review returned **changes required** (2026-10-25 — [report](./SP-120/artifacts/SP-120/review.md),
uncommitted): IR-120-1 (the DoD-10 browser pass was not executed) and
IR-120-2 (the automated gates were not independently run); no code defect
was found, and no implementer code change is assigned. On 2026-10-26 the
user reported the browser walkthrough **passed** (IR-120-1 attestation in
the [SP-120 correction log](./SP-120/README.md#plan-correction-log); not
reviewer-verified; environment and per-step results were not provided).
IR-120-2 remains open, so SP-120 is not `Reviewed`. SP-121 does not
depend on SP-120.

SP-121 is **Plan Ready** (2026-10-26 — [breakdown](./SP-121/README.md)). Its
queue's next substory is **SP-121A — implement** (backend; no blocker).
SP-121B is `Needs refinement`: run the `ui-refiner` agent on SP-121B before
code. Children are lettered from A and executed in alphabetical order A → B
(user direction 2026-10-26, D121-6).

## Quality gate — SP-121 plan (2026-10-26)

**Plan Ready** — D121-1 (PATCH-only status) follows the existing create
default and D120-4; D121-2 exposes the closed schema enum the UI already
renders; D121-3 applies D114-5. D121-4/D121-5 (unfinished set, client-side
filter) are planner-recorded, reversible, and flagged for user
confirmation. D121-6 records the user's 2026-10-26 lettering/order
direction. B is `Needs refinement` for UI/UX (ui-refiner handoff).
Implementation of A is not blocked (SP-113/SP-114/SP-115 reviewed; SP-120
implemented — its open review findings are execution evidence, no code
defect, and story 5 does not depend on it). Full gate table:
[SP-121 README](./SP-121/README.md#quality-gate-2026-10-26). Correction log:
[PC-121-01](./SP-121/README.md#plan-correction-log) (EP03 queue repair).
No Jira sync was authorized for this planning task; all SP-121 keys are
`Pending creation`.

## Quality gate — SP-120 plan (2026-10-25)

**Plan Ready** — D120-1 (use the existing `Task` model — no migration) is
grounded in the existing schema relation + D114-4 + the service code
comments; D120-2…8 are planner-recorded (grounded, reversible). J is
`Needs refinement` for UI/UX (ui-refiner handoff). Implementation of I is
not blocked (SP-113/SP-114/SP-115 reviewed). Full gate table:
[SP-120 README](./SP-120/README.md#quality-gate-2026-10-25). No Jira sync was
authorized for this planning task; all SP-120 keys are `Pending creation`.

## Quality gate — SP-115 plan (2026-10-25)

Historical planning gate (see its outcome and the 2026-10-25 review above).
Full gate:
[SP-115 README](./SP-115/README.md#quality-gate-2026-10-25). No Jira sync was
authorized; SP-115 keys are `Pending creation`.

## Quality gate — SP-113 plan (2026-10-24)

**Plan Ready** — D113-1 (nullable `dueDate` migration) is the only
persisted-data change and is forced by the epic AC-2 (due date optional) —
the only compliant resolution, recorded with provenance; D113-2…6
planner-recorded (grounded, reversible). Implementation not blocked (EP02
complete 2026-10-23). Full gate table:
[SP-113 README](./SP-113/README.md#quality-gate-2026-10-24). No Jira sync was
authorized for this planning task; all SP-113 keys are `Pending creation`.
