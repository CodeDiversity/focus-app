# SP-113 Breakdown — Quick Assignment Creation

**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Parent:** [SP-113](./SP-113-quick-assignment-creation.md) — coordination record (not an implementation ticket)
**Milestone:** M1
**Status:** SP-113A/B/C implemented 2026-10-24 — ready for combined independent parent review. C's manual browser walk is temporarily substituted by automated checks at the session owner's instruction; see [C exception/evidence](./artifacts/SP-113C/implementation.md). Covers EP03 proposed story **1 (implement quick assignment creation)**. D113-1…6 and the historical planning gate below remain unchanged.

## Execution queue

**Delivery home:** `docs/stories/EP03/SP-113/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-113/` (parent index written by C)

**Active substory:** None — all authorized implementation finished.

**Next substory:** None — one combined independent SP-113 review next;
[parent index](./artifacts/SP-113/implementation.md) and [checkpoint](./artifacts/SP-113/checkpoint.md).

**Implementation owner:** `implementer`, sequential across all layers (A → B → C;
backend/frontend/integration are scope labels, not concurrent writers).

**Final review:** One combined SP-113 review after every child and the
integration obligation are implemented; no per-child review gates. Final
artifacts: `./artifacts/SP-113/review.md` + `./artifacts/SP-113/walkthrough.md`.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](./SP-113A-assignment-create-api.md) | **Implemented — awaiting parent review** | EP02 complete (satisfied 2026-10-23); no other EP03 work | combined independent parent review | [implementation](./artifacts/SP-113A/implementation.md) · [checkpoint](./artifacts/SP-113A/checkpoint.md) |
| [B](./SP-113B-quick-create-assignment-ui.md) | **Implemented — awaiting parent review** | SP-113A implemented; SP-112B implemented (satisfied 2026-10-23 — the section it extends) | combined independent parent review | [implementation](./artifacts/SP-113B/implementation.md) · [checkpoint](./artifacts/SP-113B/checkpoint.md) |
| [C](./SP-113C-quick-create-integration-signoff.md) | **Implemented — awaiting parent review** | A, B implemented (satisfied 2026-10-24); owner authorized automated substitute for browser walk for now | combined independent parent review | [implementation](./artifacts/SP-113C/implementation.md) · [checkpoint](./artifacts/SP-113C/checkpoint.md) · [parent index](./artifacts/SP-113/implementation.md) |

Sequence: SP-113 (A → B → C), one sequential writer.
Rationale: A creates the resource + API; B builds the quick-create UI on the
course detail page (the natural home — the student is already in the course
context, and SP-112B's read-only section is the display surface); C is the
named integration owner (e2e + DoD-10 sign-off + parent index).

## Code baseline (2026-10-24)

- `Assignment` model (`apps/api/prisma/schema.prisma` 184–207): id, `userId`
  (cascade), `courseId?` **nullable** (no explicit `onDelete` on the optional
  relation — Prisma default `SetNull`), title, description?, **`dueDate
  DateTime` required**, estimatedHours?, actualHours?, status
  @default(PENDING), priority @default(MEDIUM), timestamps, `tasks Task[]`,
  `@@map("assignments")`. No user-created rows exist (no seed file, no API
  module).
- Enums: `AssignmentStatus` (PENDING, IN_PROGRESS, COMPLETED, SUBMITTED,
  GRADED), `AssignmentPriority` (LOW, MEDIUM, HIGH, URGENT).
- **No assignments API module** (`apps/api/src/modules/` = auth, courses,
  email, onboarding, prisma, semesters, users) — this parent creates it (A);
  `apps/api/src/app.module.ts` is where feature modules register.
- Ownership convention: `apps/api/src/common/ownership/ownership.ts`
  (`ownedWhere`/`assertOwned`/`assertAffected`; uniform 404
  `RESOURCE_NOT_FOUND` via `all-exceptions.filter.ts`); `Assignment` is in the
  scope-by-`userId` model list.
- Global `FieldValidationPipe` (whitelist + `forbidNonWhitelisted`) —
  `apps/api/src/common/validation.pipe.ts`; DTO + service re-check pattern per
  the courses module (SP-107B/SP-111A/SP-112A).
- Frontend: `entities/course/api/courseApi.ts` (plain axios
  `@/shared/api/httpClient`; `getCourse` → `CourseDetail` incl. `assignments:
  CourseAssignment[]`), `pages/courses/ui/CourseDetailPage.tsx` (single fetch
  D112B-13; `onMeetingChanged` → background refetch D112B-10),
  `features/courses/ui/AssignmentsSection.tsx` (read-only; badge palettes;
  "No assignments yet." empty state, no CTA), `shared/types/academic.ts`
  (`Assignment.dueDate: string` non-null — B widens to `string | null`; the
  full type is referenced by `Task` per the file comment), `shared/lib/datetime.ts`
  (`formatDate`/`getBrowserTimeZone`), `main.tsx` (`<Toaster />` — F-112B-1).
- E2E harness: `apps/api/src/test/test-http.ts` (`createIntegrationApp` —
  real HTTP, main.ts module parity, real Postgres, self-skips without
  `DATABASE_URL`); the SP-112C `courses-meetings-e2e.spec.ts` is the pattern.

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| D113-1 | **`dueDate` becomes nullable** (`DateTime?`, one migration). The epic AC-2 makes the due date an *optional* field; the model currently requires it — the only compliant resolution (requiring it in the API would violate the epic). Grounded in the in-schema precedent (`Task.dueDate` is already nullable) and SP-112's detail ordering (`dueDate asc nulls-last` already anticipates nulls). Safe: no assignment rows exist (no seed, no API); existing non-null values are preserved. | Epic AC-2 (product decision) + `Task.dueDate` precedent + D112-3 ordering. Not a free choice. |
| D113-2 | **Top-level `POST /assignments`** resource — not nested under the course routes. The model's `courseId` is nullable (an assignment can exist without a course) and the downstream consumers are cross-course: stories 6/7 (lists with course filtering), EP05 (dashboard), EP06/EP07 (planning). Deliberate deviation from the meetings nesting (D112-2), which was intrinsic to the course. `courseId` is a plain body field: malformed/missing/foreign → uniform 404 (the `CreateCourseDto.semesterId` precedent). | Model shape + downstream epic needs. Reversible early (no consumer exists yet). |
| D113-3 | **Create always starts `PENDING`; `status` is not in the DTO** (`forbidNonWhitelisted` → 400 if sent). Status is a lifecycle field owned by proposed story 5 (completion and status tracking); allowing it at create would leak that story's scope. Likewise `type` is not in the DTO (no column yet — story 3 adds it). | Story 5/3 boundaries in the epic's proposed stories. |
| D113-4 | **FSD home:** the quick-create form lives in `features/courses/ui/` (colocated with the `AssignmentsSection` it extends — the D112-5 meetings precedent; the FSD layer rule forbids a `features/courses` → `features/assignments` lateral import). The API client is a new `entities/assignment/api/assignmentApi.ts` (top-level resource → its own entity folder; `features/courses` may import it — downward). The 201 response = the SP-112 10-key read-only shape (no `userId`/`courseId`/nested course; `dueDate` ISO or null). | SP-109 FSD convention + D112-5 + SP-112 projection. |
| D113-5 | **Field rules:** `title` required, non-whitespace, ≤ 200 chars (course `name` ≤ 100 precedent, widened — assignment titles run longer); `description` optional ≤ 2000 (course precedent); `dueDate` optional ISO-8601 — **past dates accepted** (overdue *display* is story 7; a student may legitimately create against a past deadline); `estimatedHours` optional, `0 < h ≤ 1000`; `priority` optional enum, absent → schema default MEDIUM. | Course DTO validation precedent (SP-107B/SP-111A) + epic AC-2. Reversible. |
| D113-6 | **UI refresh = the existing page refetch** (D112B-10): on create success the course detail re-runs `getCourse` in the background; the section re-renders from the projection. No `GET /assignments` in story 1 — list/detail routes belong to stories 2/6/7. | The SP-112B single-fetch pattern. |

## Shared API contract

Fixed cross-child contract. A implements; B consumes; C verifies end-to-end.

```text
POST /assignments
  body: { title: string (required, non-whitespace, ≤ 200),
          courseId?: string (plain; malformed/missing/foreign → uniform 404),
          dueDate?: ISO-8601 datetime string (or null/omitted — D113-1),
          estimatedHours?: number (0 < h ≤ 1000),
          priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" (absent → MEDIUM),
          description?: string (≤ 2000) }
  201 → Assignment (the SP-112 10-key read-only shape: id, title,
          description, dueDate ISO | null, estimatedHours, actualHours,
          status, priority, createdAt, updatedAt — no userId/courseId/
          nested course)
  400 → field-level errors map (title/dueDate/estimatedHours/priority/
        description; unknown fields incl. status/type/userId)
  404 → uniform "Resource not found" — courseId present but the course is
        missing OR owned by another student (no existence oracle)
  401 → unauthenticated
```

Validation: backend `FieldValidationPipe` (whitelist + `forbidNonWhitelisted`)
plus service re-checks (backend authoritative); the frontend form mirrors the
field rules (B). `status` always starts PENDING (D113-3).

**Downstream consumers:** stories 2/6/7 (list/detail/filter routes on the same
resource), EP05 (dashboard), EP06/EP07 (planning); the course-detail
projection (SP-112, D112-3) displays created rows with no EP02 rework.

## Source requirements and test traceability

Epic acceptance criteria (original wording in
[EP03](../../../epics/EP03-assignment-and-task-management.md#acceptance-criteria);
stable IDs per the [EP03 breakdown](../README.md)):

| Req | Requirement (original wording) | Owning children |
|---|---|---|
| AC-E03-01 | Students can create an assignment with a title and course. | A (API), B (quick-create UI), C (integrated proof) |
| AC-E03-02 | Optional fields include due date, estimated duration, type, and priority. | A/B/C for **due date, estimated duration, priority**; the `type` field is owned by proposed story 3 (TBD — not yet broken down) and is **not** part of this parent. |

AC-E03-03…07 are owned by proposed stories 4–7 (not yet broken down — recorded
in the [EP03 README](../README.md), not silently dropped). The epic defines no
test requirements; story-level test obligations are owned per child below.

Shared DoD ([docs/epics/README.md](../../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | A (API behavior), B (UI behavior), C (integrated) |
| 2 invalid-input validation | A (DTO + service re-checks), B (form client-side) |
| 3 student data scoping | A (principal-scoped create; course ownership gate; uniform 404), C (cross-student proof) |
| 4 actionable API errors | A (field-level 400, uniform 404), B (display) |
| 5 loading/empty/error states | B (form + section states), C (integrated) |
| 6 keyboard accessibility | B (form, dialog, section) |
| 7 responsive layouts | B (mobile + desktop) |
| 8 automated business-rule tests | A (unit + data-scoping), B (component), C (e2e) |
| 9 API/migration documentation | A (contract in this README; migration = `dueDate` nullable) |
| 10 integrated development review | C (manual browser sign-off) + the combined parent review |

## Security invariants and counterexamples

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| No cross-student assignment creation | Student B POSTs with student A's course id | course gate first (`course.findFirst({ where: { id, userId } })` → uniform 404); the created row's `userId` is the principal only (never the body — `forbidNonWhitelisted` rejects a `userId` field); nothing written on a gate miss | A (unit + data-scoping), C (two-student matrix) |
| A created assignment is invisible to other students | Student B reads A's new assignment via the course-detail projection | every read carries `userId` in the where (the SP-112 projection already does); a cross-student course → uniform 404 before any projection | A (data-scoping), C |
| Input is sane | Client POSTs a whitespace-only title, a 201-char title, `dueDate: "yesterday"`, `estimatedHours: 0` / `-3` / `100000`, `priority: "SUPER"`, or an unknown `status`/`type` field | DTO decorators + service re-checks → 400 field-level; `forbidNonWhitelisted` → 400 on unknown fields; nothing written | A (validator + 400 cases), B (form mirrors) |
| Create cannot set lifecycle state | Client POSTs `status: "COMPLETED"` | `status` is not whitelisted → 400; the schema default PENDING applies | A (unit) |

## Plan correction log

(Empty at planning time — first plan of this parent. Entries below are appended
with stable IDs; original findings are preserved, never overwritten.)

## Quality gate (2026-10-24)

| Gate | Status | Evidence / limitation |
|---|---|---|
| 1. Child separation and sizing | Pass | Three children, each with a sizing block grounded in inspected code. A and B are substantial, independently testable outcomes in different layers (new module + migration + one route vs form + section + entity API + a11y), each ~2–2.5 h within the 1–3 h target; C is a real verification outcome (new e2e spec + manual DoD-10 sign-off + parent index — the SP-110C/SP-111C/SP-112C precedent), not a status child. No README-only/status-only children; the create validation + ownership core is one atomic unit inside A. |
| 2. Original AC/TR coverage | Pass | AC-E03-01 owned by A/B/C; AC-E03-02 owned by A/B/C for the three fields that exist, with the `type` remainder explicitly assigned to proposed story 3 (TBD) in the [EP03 README](../README.md). AC-E03-03…07 owned by stories 4–7 (TBD — recorded, not silently dropped). The epic defines no TRs. |
| 3. Applicable DoD, incl. item 10 | Pass | DoD map above: 1–8 owned by A/B/C as applicable, 9 by A (`dueDate` migration), 10 by C + the combined parent review. |
| 4. Contract consistency and integration ownership | Pass | One shared contract section (`POST /assignments`); A implements, B consumes field-by-field against its ACs, C is the named integration owner with explicit dependencies on A + B. |
| 5. Code paths inspected | Pass | `apps/api/prisma/schema.prisma` (`Assignment` 184–207, enums 209–222, `Task` 224+), `apps/api/src/modules/` (no assignments module), `apps/api/src/app.module.ts`, `apps/api/src/common/ownership/ownership.ts`, `apps/api/src/common/validation.pipe.ts`, the courses DTOs (SP-107B/SP-112A pattern), `apps/api/src/test/test-http.ts`, `apps/web/src/entities/course/api/courseApi.ts`, `pages/courses/ui/CourseDetailPage.tsx`, `features/courses/ui/AssignmentsSection.tsx`, `shared/types/academic.ts`, the SP-112 breakdown (D112-3/5/6 + F-112B-1), the EP02/EP03 baselines. Unverified: none material. |
| 6. Feature-specific risks/counterexamples | Pass | Four invariants with concrete counterexamples, mechanisms, and owning tests (cross-student create, cross-student read, input sanity, lifecycle-state lockout). |
| 7. Dependency mapping and sequencing | Pass | EP02 → SP-113 (satisfied 2026-10-23); A → B → C within, one sequential writer; B additionally extends the SP-112B section (satisfied). No other EP03 parent is started (user scope: story 1 only). |
| 8. Material decisions | Pass | D113-1 (nullable `dueDate`) is forced by the epic AC-2 — the only compliant resolution, provenance recorded; D113-2…6 are planner decisions, each grounded in an in-repo precedent or the epic text and marked reversible. No open material question. |
| 9. Correction log | Pass | Empty — first plan of this parent; no prior findings to preserve. |
| 10. Jira identity/sync | Not applicable | No sync authorized for this planning task. Parent + children are `Pending creation`; no duplicate keys, no tracker mutation. |

**Outcome:** **Plan Ready** — all applicable planning gate rows pass; no
unresolved material planning findings. Implementation not blocked (EP02
complete 2026-10-23). No implementation or passing tests are claimed; the plan
approves planning obligations only. Next actionable: **SP-113A** (execution
queue).

## Final implementation review unit

- **Parent:** SP-113 — `docs/stories/EP03/SP-113/`
- **In scope:** SP-113A, SP-113B, SP-113C (all children + integration)
- **Integration/index owner:** SP-113C (writes the parent index at
  `./artifacts/SP-113/implementation.md`)
- **Gate:** one combined SP-113 review after every child is implemented
  (`./artifacts/SP-113/review.md` + `walkthrough.md`); child implementation
  completion unblocks dependent work, but only the passing combined review
  establishes sign-off.
