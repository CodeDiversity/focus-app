# SP-112 Breakdown — Recurring Class Meetings & Course Detail

**Epic:** [EP02: Semester & Course Management](../../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18)
**Parent:** [SP-112](./SP-112-class-meetings-and-course-detail.md) — coordination record (not an implementation ticket)
**Milestone:** M1
**Status:** Planned 2026-10-21 — covers EP02 proposed stories **5 (manage recurring class meetings), 6 (course list and detail views)**. D112-1…6 planner-recorded (all grounded, reversible). **Plan Ready** (gate below). **Unblocked 2026-10-23** — SP-111 complete (implemented + final combined parent review PASS 2026-10-22); the plan was re-verified against the post-SP-111 code the same day (baseline holds; one cosmetic ticket-path fix, F-112P-1).

## Execution queue

**Delivery home:** `docs/stories/EP02/SP-112/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-112/` (parent index written by C)

**Active substory:** None — SP-111 review unit complete (2026-10-22); SP-112 is
the next EP02 delivery home, no implementation started

**Next substory:** SP-112A (implement) — no blockers: SP-111 complete
(implemented + reviewed PASS 2026-10-22); SP-112A extends the SP-111A courses
module. After A: **SP-112B needs a `ui-refiner` pass** (UI/UX gaps recorded in
its ticket, 2026-10-23) before implementation.

**Implementation owner:** `implementer`, sequential across all layers (A → B → C;
backend/frontend/integration are scope labels, not concurrent writers).

**Final review:** One combined SP-112 review after every child and the integration
obligation are implemented; no per-child review gates. Final artifacts:
`./artifacts/SP-112/review.md` + `./artifacts/SP-112/walkthrough.md`.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](./SP-112A-class-meetings-api.md) | Ready | SP-111A implemented + reviewed (satisfied 2026-10-22 — extends the courses module + `GET /courses/:id`); SP-104 implemented + reviewed | implement | — |
| [B](./SP-112B-course-detail-ui.md) | Needs refinement | SP-111B implemented (satisfied); SP-112A implemented (pending); contract fixed in this README | `ui-refiner` pass, then implement | — |
| [C](./SP-112C-meetings-integration-signoff.md) | Queued | A, B implemented | — | — |

Sequence: SP-111 (A→B→C, **complete 2026-10-22**) **→** SP-112 (A→B→C), one
sequential writer.
Rationale: meetings attach to courses (D112-2), and the course detail page —
the natural home for the meetings UI — is built once, with both the meetings
and assignments sections (D112-3), rather than twice. C is the named
integration owner.

## Code baseline (2026-10-21)

- **No `ClassMeeting` model exists** — the epic's technical notes name it, but
  it was never created (verified against `schema.prisma` 2026-10-21). This
  parent creates it (A, one migration).
- **Time-representation precedent:** `AvailabilitySlot` (schema lines 253–266)
  — `dayOfWeek Int` (0–6, Sunday–Saturday) + `startTime`/`endTime` as `HH:mm`
  strings. D112-1 follows it.
- `Course` model (lines 135–155): after SP-111A it carries `instructor?`;
  `assignments Assignment[]` relation exists; no meetings relation yet.
- `Assignment` model (lines 161–181) **exists** (id, `courseId?`, title,
  description?, `dueDate DateTime`, estimated/actual hours, status, priority,
  timestamps) — but there is **no assignments API module** (that is EP03).
  D112-3 projects it read-only.
- Frontend: after SP-111B, `features/courses/` holds the list/form/archive UI
  and `pages/courses/ui/CoursesPage.tsx` exists; no detail page yet.
- SP-111 (course management) is the direct predecessor — its `GET /courses/:id`
  route and `CourseWithSemester` shape are extended, not duplicated (D107-9).
- **Re-verified 2026-10-23 (post-SP-111):** every baseline claim above still
  holds in the current tree — `ClassMeeting` still absent from
  `schema.prisma`; `Course` carries `instructor?` + the `assignments` relation
  (no meetings relation yet); `AvailabilitySlot` unchanged; the courses module
  implements the SP-111 contract (list/get/patch, `CourseWithSemester`) and its
  header comment anticipates exactly this SP-112 extension;
  `features/courses/ui/` holds `CourseList`/`CourseForm`/`ArchiveCourseDialog`,
  `pages/courses/ui/CoursesPage.tsx` exists, `entities/course/api/courseApi.ts`
  has `getCourse`, the `/courses` route sits inside `ProtectedRoute`
  (`apps/web/src/app/App.tsx`), and the header nav carries Courses.
  `CourseList` rows carry no navigation yet (B adds the detail links).

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| D112-1 | **`ClassMeeting` representation follows the `AvailabilitySlot` precedent:** `dayOfWeek Int` (0–6, Sunday=0 … Saturday=6) + `startTime`/`endTime` as `HH:mm` 24-hour strings. `endTime` must be **strictly after** `startTime` on the same day — no midnight wrap in the MVP. | Planner 2026-10-21, grounded in `AvailabilitySlot` (the only in-repo recurring-weekly-time precedent). Reversible; EP04 (calendar) consumes the same shape. |
| D112-2 | **Meetings are nested under the course routes** — `GET/POST /courses/:id/meetings`, `PATCH/DELETE /courses/:id/meetings/:meetingId` — not a top-level `/meetings` resource. The course is the navigation and ownership unit; every meeting query still carries the principal's `userId` in the `where` clause (the model has its own `userId` column per the ownership convention). | Planner 2026-10-21, grounded in the course-scoped UI (meetings are managed on the detail page) + the repo ownership convention. Reversible. |
| D112-3 | **`GET /courses/:id` (SP-111A's route) is extended** to project `meetings: ClassMeeting[]` (ordered `dayOfWeek` asc, `startTime` asc) and `assignments: Assignment[]` (read-only, ordered `dueDate` asc nulls-last, then title; `dueDate` ISO-serialized — EP03 owns date semantics). Satisfies AC-E02-06; assignments are simply **empty until EP03** builds management, then populate the same projection with no EP02 rework. The **list** route stays light (`CourseWithSemester` only — no nested collections). | Planner 2026-10-21, grounded in the existing `Assignment` model + the epic AC. Reversible. |
| D112-4 | **Course deletion cascades to meetings in the schema** (`onDelete: Cascade`) — a safety net only: the MVP exposes no course hard-delete (D111-2), so no user path can destroy meetings. | Planner 2026-10-21, grounded in the schema relation style (cf. `Semester.courses`). |
| D112-5 | **Frontend home (FSD, SP-109):** the meetings UI (`MeetingsSection`) and the read-only `AssignmentsSection` live in `features/courses/`; the route screen is `pages/courses/ui/CourseDetailPage.tsx` at `/courses/:id` inside `ProtectedRoute`; the SP-111B list rows become links to the detail page. | Planner 2026-10-21, grounded in the SP-109 FSD convention and SP-111B's `features/courses/` folder. |
| D112-6 | **The assignments section is read-only** (title, due date, status badge, priority) with an empty state — no management UI (that is EP03, proposed stories 1–7). | Planner 2026-10-21, grounded in the epic boundary (EP03 owns assignment management; EP02 only *displays*). |

## Shared API contract

Fixed cross-child contract. A implements; B consumes; C verifies end-to-end.
The SP-111 contract (list/get/patch courses) remains in force; this section
adds the meeting routes and the `GET /courses/:id` extension.

```text
GET /courses/:id/meetings
  200 → [ ClassMeeting ]  ordered by dayOfWeek asc, then startTime asc
  404 → "Resource not found" — course missing OR owned by another student
        (uniform; no existence oracle)
  401 → unauthenticated

POST /courses/:id/meetings
  body: { dayOfWeek: 0-6 (int), startTime: "HH:mm", endTime: "HH:mm" }
  201 → ClassMeeting
  400 → field-level errors map: dayOfWeek integer 0-6; times match
        ^\d{2}:\d{2}$ with hour 00-23 / minute 00-59; endTime strictly
        after startTime (same day — no midnight wrap)
  404 → uniform (course missing/foreign)
  409 → a meeting with the same dayOfWeek + startTime already exists for
        this course (P2002 on @@unique([courseId, dayOfWeek, startTime]))
  401 → unauthenticated

PATCH /courses/:id/meetings/:meetingId   (partial body; at least one field)
  body: { dayOfWeek?, startTime?, endTime? }
  200 → ClassMeeting (updated; validation on the merged values)
  400 / 404 (uniform: meeting missing, owned by another student, OR not
        belonging to the :id course) / 409 (same rule as POST) / 401

DELETE /courses/:id/meetings/:meetingId
  204 → deleted
  404 → uniform (same conditions as PATCH)
  401 → unauthenticated

GET /courses/:id   (SP-111A route, extended by A — D112-3)
  200 → CourseWithSemester + { meetings: [ ClassMeeting ],
                               assignments: [ Assignment ] }
  (same 404/401 as the SP-111 contract; the list route is unchanged)

ClassMeeting = { id, dayOfWeek, startTime, endTime, createdAt, updatedAt }
  createdAt/updatedAt ISO timestamps.

Assignment projection (read-only) = { id, title, description, dueDate,
  estimatedHours, actualHours, status, priority, createdAt, updatedAt }
  — the existing frontend `Assignment` type minus the nested `course`.
```

Validation rules: backend `FieldValidationPipe` (whitelist +
`forbidNonWhitelisted`; unknown fields → 400) plus service re-checks (backend
authoritative); the frontend form mirrors the field rules (B).

**Downstream consumers:** EP04 (calendar) projects `ClassMeeting` rows onto
dates (same `dayOfWeek` + `HH:mm` shape as `AvailabilitySlot`); EP05
(dashboard) may read the detail projection.

## Source requirements and test traceability

Epic acceptance criteria (original wording in
[EP02](../../../epics/EP02-semester-and-course-management.md#acceptance-criteria);
stable IDs per the [EP02 breakdown](../README.md)):

| Req | Requirement (original wording) | Owning children |
|---|---|---|
| AC-E02-04 | Students can add recurring class meetings with start and end times. | A (API), B (meetings UI), C (integrated proof) |
| AC-E02-06 | Course details display related assignments and class meetings. | A (detail projections), B (detail page sections), C (integrated proof) |

AC-E02-02/03/05 are owned by SP-111; AC-E02-01 by SP-110 (both done at
planning time / planned the same pass). The epic defines no test requirements;
story-level test obligations are owned per child below.

Shared DoD ([docs/epics/README.md](../../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | A (API behavior), B (UI behavior), C (integrated) |
| 2 invalid-input validation | A (DTO + service re-checks), B (form client-side) |
| 3 student data scoping | A (every route principal-scoped; uniform 404), C (cross-student proof) |
| 4 actionable API errors | A (field-level 400, specific 409, uniform 404), B (display) |
| 5 loading/empty/error states | B (sections + page states), C (integrated) |
| 6 keyboard accessibility | B (sections, forms, dialogs) |
| 7 responsive layouts | B (mobile + desktop) |
| 8 automated business-rule tests | A (unit + data-scoping), B (component), C (e2e) |
| 9 API/migration documentation | A (contract in this README; migration = new `class_meetings` table + `Course` relation) |
| 10 integrated development review | C (manual browser sign-off) + the combined parent review |

## Security invariants and counterexamples

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| No cross-student meeting read/write | Student B POSTs/PATCHes/DELETEs a meeting under student A's course id | course ownership checked first (`findFirst({ where: { id, userId } })` → uniform 404); meeting queries carry `userId` in the where; a miss → uniform 404 — B never learns A's meetings exist | A (unit + data-scoping), C (two-student matrix) |
| A meeting always belongs to the course in the URL | Client PATCHes `:meetingId` that belongs to a *different* (own) course via `:id` | the meeting lookup requires **both** `courseId = :id` and `userId`; a mismatch → uniform 404, no write | A (unit + data-scoping), C |
| Meeting times are sane recurring times | Client POSTs `endTime <= startTime`, `25:00`, `12:60`, or a midnight wrap | strict `HH:mm` parse + `end > start` on the merged values → 400 field-level; nothing written | A (validator + 400 cases), B (form refinement) |
| Duplicate weekly slots are rejected | Two `Mon 09:00` meetings on one course | `@@unique([courseId, dayOfWeek, startTime])` → 409 with the resource-specific message | A (unit + data-scoping) |

## Plan correction log

(Empty at planning time — no findings yet. Entries are appended with stable IDs;
original findings are preserved, never overwritten.)

## Quality gate (2026-10-21)

| Gate | Status | Evidence / limitation |
|---|---|---|
| 1. Child separation and sizing | Pass | Three children, each with a sizing block grounded in inspected code. Concrete split rationale: A and B are substantial, independently testable outcomes in different layers (new model + migration + four routes vs detail page/sections/a11y), each ~2.5–3 h within the 1–3 h target; C is a real verification outcome (new e2e spec + manual DoD-10 sign-off + parent index — the SP-110C/SP-111C precedent), not a status child. No README-only/status-only children; the meeting time-validation is one atomic core inside A. |
| 2. Original AC/TR coverage | Pass | AC-E02-04/06 owned by A/B/C as above; AC-E02-01/02/03/05 owned by SP-110/SP-111 (planned/complete). The epic defines no TRs. |
| 3. Applicable DoD, incl. item 10 | Pass | DoD map above: 1–8 owned by A/B/C as applicable, 9 by A (class_meetings migration), 10 by C + the combined parent review. |
| 4. Contract consistency and integration ownership | Pass | One shared contract section (meeting routes + `GET /courses/:id` extension); A implements, B consumes (field-by-field against each child's ACs), C is the named integration owner with explicit dependencies on A + B. |
| 5. Code paths inspected | Pass | `apps/api/prisma/schema.prisma` (`Course` 135–155, `Assignment` 161–181, `AvailabilitySlot` 253–266), `apps/api/src/modules/courses/*` (SP-107B shape), `apps/api/src/common/ownership/ownership.ts`, `apps/api/src/common/filters/all-exceptions.filter.ts`, `apps/web/src/entities/{course,semester}/api`, `shared/types/academic.ts` (`Assignment` type), the SP-110/SP-111 breakdowns (pattern + decisions), the EP02 baseline. Unverified: none material. |
| 6. Feature-specific risks/counterexamples | Pass | Four invariants with concrete counterexamples, mechanisms, and owning tests (data CRUD/ownership, nested-reference integrity, time validation, per-course uniqueness). |
| 7. Dependency mapping and sequencing | Pass | SP-111 → SP-112, A → B → C within, one sequential writer; SP-112A extends the SP-111A module (explicit dependency — **satisfied 2026-10-22**: SP-111 implemented + reviewed PASS); upstream SP-104/SP-109/SP-110 implemented + reviewed. |
| 8. Material decisions | Pass | D112-1…6 are all planner decisions, each grounded in an in-repo precedent or the epic text and marked reversible. No persisted-data or security-policy choice requires user confirmation: the `ClassMeeting` shape follows the existing `AvailabilitySlot` precedent, and the assignments projection is read-only (management stays with EP03). No open material question. |
| 9. Correction log | Pass | Empty at planning time; no findings to correct. |
| 10. Jira identity/sync | Not applicable | No sync authorized for this planning task. Parent + children are `Pending creation`; no duplicate keys, no tracker mutation. |

**Outcome:** **Plan Ready** — all applicable planning gate rows pass; no
unresolved material planning findings. Implementation is **unblocked
2026-10-23**: SP-111 complete (implemented + final combined parent review PASS
2026-10-22), and the plan was re-verified against the post-SP-111 code the
same day (baseline holds; F-112P-1 cosmetic fix only). No implementation or
passing tests are claimed; the plan approves planning obligations only. Next
actionable: **SP-112A** (execution queue).

## Final implementation review unit

- **Parent:** SP-112 — `docs/stories/EP02/SP-112/`
- **In scope:** SP-112A, SP-112B, SP-112C (all children + integration)
- **Integration/index owner:** SP-112C (writes the parent index at
  `./artifacts/SP-112/implementation.md`)
- **Gate:** one combined SP-112 review after every child is implemented
  (`./artifacts/SP-112/review.md` + `walkthrough.md`); child implementation
  completion unblocks dependent work, but only the passing combined review
  establishes sign-off.
