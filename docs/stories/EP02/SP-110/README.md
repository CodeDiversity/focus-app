# SP-110 Breakdown — Create and Manage Semesters

**Epic:** [EP02: Semester & Course Management](../../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18)
**Parent:** [SP-110](./SP-110-create-and-manage-standalone.md) — coordination record (not an implementation ticket)
**Milestone:** M1
**Status:** Planned 2026-10-20 — breakdown complete (three children A–C); decisions D110-1/D110-2 user-confirmed 2026-10-20; quality gate **Plan Ready**. No implementation performed or claimed.

## Execution queue

**Delivery home:** `docs/stories/EP02/SP-110/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-110/` (parent index written by C)

**Active substory:** None

**Next substory:** SP-110A — implement

**Implementation owner:** `implementer`, sequential across all layers (A → B → C;
backend/frontend/integration are scope labels, not concurrent writers).

**Final review:** One combined SP-110 review after every child and the integration
obligation are implemented; no per-child review gates. Final artifact path:
`./artifacts/SP-110/review.md`; integration/index owner: SP-110C (parent index at
`./artifacts/SP-110/implementation.md`).

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](./SP-110A-semester-management-api.md) | Ready | SP-107B implemented (module exists in code); SP-104 implemented + reviewed; D110-1/D110-2 user-confirmed 2026-10-20 | Implement | — |
| [B](./SP-110B-semester-management-ui.md) | Ready | Contract fixed in this README; SP-109 + SP-107D implemented; A implemented (sequence) | Implement after A | — |
| [C](./SP-110C-semester-integration-signoff.md) | Queued | A, B implemented | Implement after B (integration + DoD 10 sign-off) | — |

## Upstream dependency status (2026-10-20)

- **SP-107B (EP01):** implemented (commit `03a412a`, 2026-10-18) — the
  `semesters`/`courses` modules exist with the minimal create endpoints,
  `@db.Date` dates, ownership checks. Verified in code.
- **SP-104 (EP01):** implemented + reviewed PASS (STUDY-10) — global guard,
  `@CurrentUser()`, ownership helpers, `test-http` harness.
- **SP-109 (FSD):** implemented + combined review PASS (2026-10-17) — the
  frontend layer rules B builds in.
- **SP-107 (EP01 parent review):** awaiting its combined review with a human
  DoD-10 gate — a review gap on EP01's own sign-off, not an implementation
  gap; does not block EP02 (delivery-state: an implemented child unblocks
  dependent work without formal review).

## Child inventory

| ID | Layer / owner | Scope | Dependency | Target size | Jira |
|---|---|---|---|---|---|
| [A](./SP-110A-semester-management-api.md) | Backend, `implementer` | Extend the SP-107B semesters module: `GET /semesters` (list + `courseCount`), `GET /semesters/:id`, `PATCH` (partial merge incl. single-active activation), `DELETE` (orphan courses); all principal-scoped; unit + data-scoping tests | SP-107B (done) | One ~2.5 h session | Pending creation |
| [B](./SP-110B-semester-management-ui.md) | Frontend, `implementer` | `/semesters` page (FSD): list with active badge + course count, create/edit form, activate, delete confirmation; states, a11y, responsive; header nav link | A (contract fixed in this README) | One ~2.5 h session | Pending creation |
| [C](./SP-110C-semester-integration-signoff.md) | Integration, `implementer` | Real-Postgres e2e lifecycle + cross-student matrix + single-active race + orphan proof; manual browser sign-off (DoD 10); parent index | A, B | One ~1.5–2 h session | Pending creation |

Sequence: A → B → C, one sequential writer. C is the named integration owner
for cross-layer verification.

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| D110-1 | **Activation = a single active semester per student.** `isActive` means "the student's current semester". `PATCH { isActive: true }` deactivates all of that student's other semesters and activates the target in one transaction — after every request, at most one of a student's semesters is active. | **User decision 2026-10-20** (recommended single-active presented and confirmed). Rationale: EP04 (calendar) and EP05 (dashboard) consume a singular "current semester"; the schema's single boolean plus multiple active rows would force a downstream tie-break rule. Alternatives considered: multiple active flags (checkbox semantics — rejected, ambiguous "current"); a `currentSemesterId` on `User` (rejected — duplicates state the semester rows already hold). |
| D110-2 | **Delete = hard delete; the semester's courses are orphaned, not destroyed.** `DELETE /semesters/:id` deletes the semester row and explicitly sets `semesterId: null` on its courses in the same transaction. Courses remain fully accessible (EP02's course views will show them unaffiliated). | **User decision 2026-10-20** (recommended orphaning presented and confirmed). Grounded in the schema: `Course.semester` is an optional relation (nullable `semesterId`; courses can be created without a semester — D107-6), so orphaning is representable. Alternatives: cascade-delete the courses (rejected — destroys historical data, against the spirit of AC-E02-05); block deletion while courses exist (rejected — courses have archive, not hard-delete, in the MVP (proposed story 4), which would make semesters permanently undeletable). |
| D110-3 | **List/get responses include `courseCount`** — the number of courses attached to the semester (all archive states; a stable definition across EP02). | Planner 2026-10-20; grounds the UI list row ("Fall 2026 · 4 courses") without a second endpoint. Reversible. |
| D110-4 | **Frontend home (FSD, SP-109):** API functions extend `entities/semester/api/semesterApi.ts`; the management UI (list, form, delete dialog) lives in `features/semesters/`; the route screen is `pages/semesters/ui/SemestersPage.tsx` at `/semesters` inside `ProtectedRoute`; a "Semesters" link is added to the header nav. | Planner 2026-10-20, grounded in the SP-109 FSD convention, the existing `entities/semester` folder (SP-107D), and `Header.tsx` (Home/Dashboard/Profile links). |
| D110-5 | **Update = `PATCH /semesters/:id` partial merge**; validation runs on the merged (post-patch) values; `isActive` in the same PATCH is the only activation path — no separate activate endpoint. `POST /semesters` is unchanged (SP-107B contract; created semesters start inactive, `isActive: false`). | Planner 2026-10-20; preserves the EP01 contract (D107-9 extend-don't-duplicate). |
| D110-6 | **No semester archiving.** The only removal path is delete (D110-2); `isActive` is the only state flag. The epic's archive/restore scope is courses only (proposed story 4). | Planner 2026-10-20, grounded in the epic scope list (archive appears only for courses). |

## Shared API contract

Fixed cross-child contract. A implements; B consumes; C verifies end-to-end.

```text
GET /semesters            (authenticated; userId derived from the JWT principal)
  200 → [ SemesterWithCount ]   ordered by startDate desc, then name asc
  401 → unauthenticated

GET /semesters/:id
  200 → SemesterWithCount
  404 → "Resource not found" — id missing OR owned by another student (uniform;
         no existence oracle)
  401 → unauthenticated

PATCH /semesters/:id      (partial body; at least one field)
  body: { name?: string, startDate?: string, endDate?: string,
          isActive?: boolean }
  200 → SemesterWithCount (updated)
  400 → field-level errors map on the merged values: name (non-empty after
         trim, ≤ 100 chars), startDate/endDate (valid yyyy-MM-dd), endDate
         strictly after startDate
  404 → uniform "Resource not found" (missing or foreign)
  409 → name collides with a different semester of the same student
  401 → unauthenticated
  isActive: true  → single-active invariant (D110-1): all other semesters of
                    the student deactivated in the same transaction
  isActive: false → deactivates only this semester

DELETE /semesters/:id
  204 → deleted; the semester's courses retain semesterId → null (D110-2)
  404 → uniform "Resource not found" (missing or foreign)
  401 → unauthenticated

SemesterWithCount = { id, name, startDate, endDate, isActive, courseCount,
                      createdAt, updatedAt }
  startDate/endDate serialized yyyy-MM-dd (D107-7); courseCount = attached
  courses, all archive states (D110-3); createdAt/updatedAt ISO timestamps.
```

`POST /semesters` and `POST /courses` are unchanged — the SP-107B contract in
the [EP01/SP-107 README](../../EP01/SP-107/README.md#shared-api-contract) remains in force.
Validation rules: backend `FieldValidationPipe` (whitelist + `forbidNonWhitelisted`;
unknown fields → 400) plus service re-checks (backend authoritative); the
frontend form mirrors the field rules (B).

**Downstream consumers:** EP02 course stories (proposed 2–6) consume the
semester list/activation; EP04/EP05 consume the single-active "current
semester" (D110-1).

## Source requirements and test traceability

Epic acceptance criteria (original wording in
[EP02](../../../epics/EP02-semester-and-course-management.md#acceptance-criteria);
stable IDs per the [EP02 breakdown](../README.md)):

| Req | Requirement (original wording) | Owning children |
|---|---|---|
| AC-E02-01 | Students can create semesters with start and end dates. | Creation: SP-107B (EP01, implemented — out of scope here). Management: A (API), B (UI), C (proof). |
| AC-E02-02 | Courses belong to a valid semester owned by the student. | Future EP02 course breakdown (proposed 2–4). Boundary: C proves courses survive semester deletion (D110-2). |
| AC-E02-03 | Students can create and edit course information. | Future EP02 course breakdown (proposed 2–3). |
| AC-E02-04 | Students can add recurring class meetings with start and end times. | Future EP02 breakdown (proposed 5). |
| AC-E02-05 | Archived courses remain accessible with historical data. | Future EP02 breakdown (proposed 4). Boundary: C (no course data destroyed by semester deletion). |
| AC-E02-06 | Course details display related assignments and class meetings. | Future EP02 breakdown (proposed 6). |

Epic ACs 2–6 are owned by the not-yet-broken-down course stories — not deferred
or dropped; they await a later EP02 planning pass (owner: planner). SP-110 owns
the management half of AC-E02-01 plus the data-preservation boundary that
AC-E02-02/05 impose on semester deletion.

Shared DoD ([docs/epics/README.md](../../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | A (API behavior), B (UI behavior), C (integrated) |
| 2 invalid-input validation | A (DTO + service re-check), B (form client-side) |
| 3 student data scoping | A (every route principal-scoped; uniform 404), C (cross-student proof) |
| 4 actionable API errors | A (field-level 400, specific 409, uniform 404), B (display) |
| 5 loading/empty/error states | B (page + form states), C (integrated) |
| 6 keyboard accessibility | B (list, form, dialog, activation) |
| 7 responsive layouts | B (mobile + desktop) |
| 8 automated business-rule tests | A (unit + data-scoping), B (component), C (e2e) |
| 9 API/migration documentation | A (contract in this README; **no migration — no schema change**) |
| 10 integrated development review | C (manual browser sign-off) + the combined parent review |

## Security invariants and counterexamples

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| No cross-student semester read/update/delete | Student B requests student A's semester id via GET/PATCH/DELETE | every route scopes on the JWT principal: `findFirst({ where: { id, userId } })`; `updateMany`/`deleteMany` carry `userId` in the where; a miss → uniform 404 `Resource not found` — B never learns A's semester exists | A (service unit + data-scoping spec), C (two-student HTTP matrix) |
| At most one active semester per student (D110-1) | Two concurrent `PATCH { isActive: true }` on different semesters, or a stale client re-activating an old semester | one transaction: deactivate-all-then-activate with `userId` in every write; after either interleaving the invariant holds (last write wins the activation; the loser's choice is overwritten — no error) | A (unit + data-scoping race), C (e2e proof) |
| Semester deletion never destroys course history | Student deletes a semester that has courses (including archived ones) | the delete transaction explicitly sets `semesterId: null` on the semester's courses (D110-2); course rows survive, unaffiliated | A (data-scoping), C (e2e orphan proof) |
| Calendar dates stay calendar dates (D107-7) | Client PATCHes `endDate == startDate`, `2026-02-30`, or an instant string | strict `yyyy-MM-dd` parse + end-after-start on the merged values → 400 field-level; nothing written | A (validator + 400 cases), B (form refinement) |

## Plan correction log

(Empty at planning time — no findings yet. Entries are appended with stable IDs;
original findings are preserved, never overwritten.)

## Quality gate (2026-10-20)

| Gate | Status | Evidence / limitation |
|---|---|---|
| 1. Child separation and sizing | Pass | Three children, each with a sizing block grounded in inspected code. Concrete split rationale: A and B are substantial, independently testable outcomes in different layers (backend routes/transactions vs page/components/a11y), each ~2.5 h within the 1–3 h target; C is a real verification outcome (new e2e spec + manual DoD-10 sign-off + parent index — the SP-106D/SP-107F precedent), not a status child. No README-only/status-only children; the atomic single-active transaction and the delete-orphan transaction each live in one slice (A). |
| 2. Original AC/TR coverage | Pass | AC-E02-01's management half owned by A/B/C; AC-E02-02…06 explicitly assigned to the not-yet-broken-down course stories with a named follow-up (later EP02 planning pass, owner: planner) — not deferred silently. The epic defines no TRs. |
| 3. Applicable DoD, incl. item 10 | Pass | DoD map above: 1–8 owned by A/B/C as applicable, 9 by A (no migration — no schema change), 10 by C + the combined parent review. |
| 4. Contract consistency and integration ownership | Pass | One shared contract section; A implements, B consumes (field-by-field re-verified against each child's ACs), C is the named integration owner with explicit dependencies on A + B. |
| 5. Code paths inspected | Pass | `apps/api/src/modules/semesters/{semesters.controller.ts,semesters.service.ts,dto/create-semester.dto.ts}` + both spec files, `apps/api/src/modules/courses/courses.controller.ts`, `schema.prisma` (Semester lines 114–133, Course lines 135–155), `common/lib/calendar-date.ts`, `common/ownership/ownership.ts`, `common/filters/all-exceptions.filter.ts`, `app.module.ts`, `apps/web/src/entities/{semester,course}/api`, `shared/types/academic.ts`, `features/onboarding/ui/Step2Semester.tsx`, `widgets/header/ui/Header.tsx`, `App.tsx`, `pages/dashboard/ui/DashboardPage.tsx`, `pages/profile/ui/ProfilePage.tsx`, `modules/onboarding/onboarding-e2e.spec.ts` (harness precedent), SP-107/SP-109 breakdowns. Unverified: none material. |
| 6. Feature-specific risks/counterexamples | Pass | Four invariants with concrete counterexamples, mechanisms, and owning tests (data CRUD/ownership, scheduling/date, concurrent single-use, cross-layer API). |
| 7. Dependency mapping and sequencing | Pass | A → B → C, one sequential writer; upstream SP-107B/SP-104/SP-109 implemented (SP-104 + SP-109 reviewed; SP-107 parent review pending — recorded, not a blocker per delivery-state). |
| 8. Material decisions | Pass | D110-1 (single-active) and D110-2 (delete orphans courses) **user-confirmed 2026-10-20** (both product-visible policies: persisted data + public contract + downstream EP04/EP05 behavior). D110-3/4/5/6 are planner decisions, each grounded and marked reversible. No open material question. |
| 9. Correction log | Pass | Empty at planning time; no findings to correct. |
| 10. Jira identity/sync | Not applicable | No sync authorized for this planning task. Parent + children are `Pending creation`; no duplicate keys, no tracker mutation. |

**Outcome:** **Plan Ready** — all applicable planning gate rows pass; D110-1/
D110-2 user-confirmed 2026-10-20; no unresolved material planning findings.
Implementation is **not blocked**: all upstream children (SP-107B, SP-104,
SP-109) are implemented in code. No implementation or passing tests are
claimed; the plan approves planning obligations only. Next actionable:
**SP-110A** (execution queue).

## Final implementation review unit

- **Parent:** SP-110 — `docs/stories/EP02/SP-110/`
- **In scope:** SP-110A, SP-110B, SP-110C (all children + integration)
- **Integration/index owner:** SP-110C (writes the parent index at
  `./artifacts/SP-110/implementation.md`)
- **Gate:** one combined SP-110 review after every child is implemented
  (`./artifacts/SP-110/review.md`); child implementation completion unblocks
  dependent work, but only the passing combined review establishes sign-off.
