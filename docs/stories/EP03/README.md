# EP03 Story Breakdown — Assignment & Task Management

**Epic:** [EP03: Assignment & Task Management](../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1 (functional academic tracker)
**Epic dependency:** EP02 (Semester & Course Management) — **complete 2026-10-23** (implemented + reviewed; queue at [docs/stories/EP02](../EP02/README.md#execution-queue)). EP03 implementation is **not blocked**.
**Status:** Stories 1–3 are reviewed (SP-113 and SP-114, 2026-10-24; SP-115, 2026-10-25 — [review](./SP-115/artifacts/SP-115/review.md) · [walkthrough](./SP-115/artifacts/SP-115/walkthrough.md)). Story 4 → [SP-120](./SP-120/README.md) — **Reviewed 2026-10-26**. Story 5 → [SP-121](./SP-121/README.md) — **Reviewed 2026-10-26**. Story 6 → [SP-122](./SP-122/README.md) — **Reviewed 2026-10-26** ([review](./SP-122/artifacts/SP-122/review.md) · [walkthrough](./SP-122/artifacts/SP-122/walkthrough.md)). Children A/B/C `Reviewed`. Story 7 → [SP-123](./SP-123/README.md) — **Reviewed 2026-10-26** ([review](./SP-123/artifacts/SP-123/review.md) · [walkthrough](./SP-123/artifacts/SP-123/walkthrough.md)). Children A/B `Reviewed`. DoD-10 under D123B-DoD10 exception (manual browser pass outstanding for user). Story 8 → [SP-124](./SP-124/README.md) — **Planned 2026-10-26 (Draft)**; children A/B/C `Needs refinement` for UI/UX (ui-refiner handoff). No implementation evidence. User direction (2026-10-26): SP-121 children lettered from A (D121-6); SP-122 children lettered from A (D122-8); SP-123 children lettered from A (D123-7); SP-124 children lettered from A (D124-7).
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
| [SP-120](./SP-120/README.md) | 4. Implement assignment subtasks | [2 children](./SP-120/README.md) (I backend, J frontend) — **Reviewed 2026-10-26**. Uses the existing `Task` model as subtasks (D120-1 — no migration). | Pending creation |
| [SP-121](./SP-121/README.md) | 5. Implement completion and status tracking | [2 children](./SP-121/README.md) (A backend, B frontend) — **Reviewed 2026-10-26** ([review](./SP-121/artifacts/SP-121/review.md) · [walkthrough](./SP-121/artifacts/SP-121/walkthrough.md)). Children A/B `Reviewed`. | Pending creation |
| [SP-122](./SP-122/README.md) | 6. Implement assignment search, sorting, and filters | [3 children](./SP-122/README.md) (A backend, B frontend, C integration) — **Reviewed 2026-10-26** ([review](./SP-122/artifacts/SP-122/review.md) · [walkthrough](./SP-122/artifacts/SP-122/walkthrough.md)). Children A/B/C `Reviewed`. | Pending creation |
| [SP-123](./SP-123/README.md) | 7. Implement overdue and completed assignment views | [2 children](./SP-123/README.md) (A overdue identification, B completed views) — **Reviewed 2026-10-26** ([review](./SP-123/artifacts/SP-123/review.md) · [walkthrough](./SP-123/artifacts/SP-123/walkthrough.md)). Children A/B `Reviewed`. | Pending creation |
| [SP-124](./SP-124/README.md) | 8. Assignment list cohesion (in-place edit/delete/status/subtasks/create on `/assignments`) | [3 children](./SP-124/README.md) (A row actions, B subtasks, C create) — **Planned 2026-10-26 (Draft)**; children `Needs refinement` for UI/UX (ui-refiner handoff). No implementation evidence. | Pending creation |

Story 6 is now SP-122 (broken down and reviewed 2026-10-26). Story 7 is now
SP-123 (broken down 2026-10-26; children A/B `Needs refinement`). (SP-116…SP-119
were consumed by EP09's E2E
automation: SP-116/117/118 implemented, SP-119 the dedicated-test-database
infra story.)
IDs may shift if a proposed story splits.

## Epic acceptance criteria — ownership

| Epic AC (original wording) | Stable ID | Owner |
|---|---|---|
| Students can create an assignment with a title and course. | AC-E03-01 | **SP-113** A/B/C. |
| Optional fields include due date, estimated duration, type, and priority. | AC-E03-02 | **SP-113** (due date, estimated duration, priority) + **SP-115** (the `type` column — G API, H UI). |
| Assignments can contain ordered, independently completable subtasks. | AC-E03-03 | **SP-120** I (API) / J (UI). |
| Students can update assignment status. | AC-E03-04 | **SP-121** A (API) / B (UI). |
| Completing an assignment removes it from unfinished-work views without deleting it. | AC-E03-05 | **SP-121** A (transition is a PATCH — no delete) + B (unfinished-only default view) + **SP-123B** (completed view that makes finished work visible again). |
| Overdue work is identified from the deadline and completion status. | AC-E03-06 | **SP-123A** (shared overdue predicate + indicator on course detail and the list page). |
| Assignment lists support course, date, and status filtering. | AC-E03-07 | **SP-122** A (endpoint + filters + sort) / B (list page + controls) / C (cross-layer proof). |

The epic defines no test requirements. Story-level test obligations are owned
per child in the [SP-113](./SP-113/README.md), [SP-114](./SP-114/README.md),
[SP-115](./SP-115/README.md), [SP-120](./SP-120/README.md),
[SP-121](./SP-121/README.md), and [SP-122](./SP-122/README.md) breakdowns.

## Execution queue

SP-113 and SP-114 are reviewed (2026-10-24). Their queues have no next
substory. Do not restart them.

SP-115 is reviewed (2026-10-25 — [review](./SP-115/artifacts/SP-115/review.md)
· [walkthrough](./SP-115/artifacts/SP-115/walkthrough.md)). Its queue's next
substory is None with reason: the review unit is complete.

SP-120 is **Reviewed** (2026-10-26 — [review](./SP-120/artifacts/SP-120/review.md)
· [walkthrough](./SP-120/artifacts/SP-120/walkthrough.md); [breakdown](./SP-120/README.md)).
Its queue's next substory is None with reason: the review unit is complete.
IR-120-1 and IR-120-2 are closed in that report. SP-121 does not depend on
SP-120.

SP-121 is **Reviewed** (2026-10-26 — [review](./SP-121/artifacts/SP-121/review.md)
· [walkthrough](./SP-121/artifacts/SP-121/walkthrough.md)). Its queue's next
substory is None with reason: the review unit is complete. Children A/B are
`Reviewed`.

SP-122 is **Reviewed** (2026-10-26 — [review](./SP-122/artifacts/SP-122/review.md)
· [walkthrough](./SP-122/artifacts/SP-122/walkthrough.md)). Its queue's next
substory is None with reason: the review unit is complete. Children A/B/C are
`Reviewed`. F122C-1 closed in plan (440ff2a); D122C-1 is an authorized
DoD-10 exception (manual browser pass outstanding for the user). No Jira sync
was authorized; all SP-122 keys are `Pending creation`.

SP-123 is **Reviewed** (2026-10-26 — [review](./SP-123/artifacts/SP-123/review.md)
· [walkthrough](./SP-123/artifacts/SP-123/walkthrough.md)). Children A and B are
`Reviewed`. DoD-10 manual browser pass remains outstanding under the D123B-DoD10
exception (user). No Jira sync was authorized; all SP-123 keys are `Pending
creation`.

SP-124 is **Planned (Draft, 2026-10-26)** — [breakdown](./SP-124/README.md).
Children A/B/C are `Needs refinement` for UI/UX (ui-refiner handoff); none is
ready to code until ui-refinement settles D124-7. No implementation evidence.
No Jira sync authorized; all SP-124 keys are `Pending creation`. This unit adds
no new epic AC; it adds a second editing surface for behavior already owned by
SP-113/SP-114/SP-120/SP-121.
## Quality gate — SP-123 plan (2026-10-26)

**Plan Ready** — D123-1…7 are planner-recorded and grounded in D121-4/D121-5/
D121-7 and D113-5. D123-7 leaves indicator placement/copy and the completed
affordance choice to `ui-refiner` (A and B are `Needs refinement`). No API or
schema change. Full gate table: [SP-123 README](./SP-123/README.md#quality-gate-2026-10-26). No Jira sync was authorized; all SP-123 keys are `Pending creation`.

## Quality gate — SP-122 plan (2026-10-26)

**Plan Ready** — D122-1 (top-level `GET /assignments`, no dedicated detail
page) follows D113-2; D122-2…7 are planner-recorded (grounded, reversible).
D122-8 records the per-parent lettering restart; D122-9 marks B `Needs
refinement` for UI/UX (ui-refiner handoff). A is not blocked. Full gate table:
[SP-122 README](./SP-122/README.md#quality-gate-2026-10-26). No Jira sync was
authorized; all SP-122 keys are `Pending creation`.

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
