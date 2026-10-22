# SP-111 Breakdown — Course Management (Create, Edit, Archive)

**Epic:** [EP02: Semester & Course Management](../../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18)
**Parent:** [SP-111](./SP-111-course-management.md) — coordination record (not an implementation ticket)
**Milestone:** M1
**Status:** Planned 2026-10-21 — covers EP02 proposed stories **2 (create a course), 3 (edit course information), 4 (archive and restore courses)**. D111-1 user-confirmed 2026-10-21; D111-2…5 planner-recorded. **Plan Ready** (gate below). **Complete 2026-10-22** — all children implemented; final combined parent review **PASS** (F-111R-1 closed by user waiver; [review](./artifacts/SP-111/review.md) + [walkthrough](./artifacts/SP-111/walkthrough.md)).

## Execution queue

**Delivery home:** `docs/stories/EP02/SP-111/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-111/` (parent index written by C)

**Active substory:** None — SP-111 complete: all three children implemented
and `Reviewed` (A/B 2026-10-21, C 2026-10-22; checkpoints in
`./artifacts/`), final combined parent review passed 2026-10-22 ([review](./artifacts/SP-111/review.md) + [walkthrough](./artifacts/SP-111/walkthrough.md)).

**Next substory:** None — the SP-111 review unit is complete: final combined
parent review **PASS** 2026-10-22 (F-111R-1 closed by user waiver; F-111R-2/3
accepted as-is — correction log below) — [review](./artifacts/SP-111/review.md), [walkthrough](./artifacts/SP-111/walkthrough.md).
Next queued EP02 work: the SP-112 breakdown (`../SP-112/` — separate delivery
home). *(History: the DoD-10 human browser-walk ratification was done 2026-10-22
— PASSED with one deviation, F111C-3, since fixed; record in
`./artifacts/SP-111C/implementation.md`. Planner judgment 2026-10-21 (user
delegated the call): this breakdown proceeded directly to implementation
without a formal plan review, on the SP-110 precedent; the mandatory final
combined parent review gated sign-off and passed.)*

**Implementation owner:** `implementer`, sequential across all layers (A → B → C;
backend/frontend/integration are scope labels, not concurrent writers).

**Final review:** One combined SP-111 review after every child and the integration
obligation are implemented; no per-child review gates. Final artifacts:
`./artifacts/SP-111/review.md` + `./artifacts/SP-111/walkthrough.md`.
**Verdict: PASS 2026-10-22** (F-111R-1 closed by user waiver; F-111R-2/3
accepted as-is — correction log below). Both artifacts saved and verified.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](./SP-111A-course-management-api.md) | Reviewed | SP-107B implemented (module exists in code); SP-104 implemented + reviewed; D111-1 user-confirmed 2026-10-21 | — | `./artifacts/SP-111A/implementation.md` (+ `checkpoint.md`) |
| [B](./SP-111B-course-management-ui.md) | Reviewed | A implemented (contract fixed in this README); SP-109 + SP-107D/E implemented (FSD + entities) | — | `./artifacts/SP-111B/implementation.md` (+ `checkpoint.md`) |
| [C](./SP-111C-course-integration-signoff.md) | Reviewed | A, B implemented (satisfied) | — | `./artifacts/SP-111C/implementation.md` (+ `checkpoint.md`) |

Sequence: A → B → C, one sequential writer. C is the named integration owner
for cross-layer verification.

## Code baseline (2026-10-21)

- `apps/api/src/modules/courses/` — **`POST /courses` only** (SP-107B, onboarding-minimal): `create-course.dto.ts` (code/name/semesterId/description/credits/color), `courses.service.ts` (`toResponse` = 8-key shape, deliberately no `semesterId` — its header comment anticipates that "EP02 may extend the shape when it adds read routes"), `courses.controller.ts`, unit + data-scoping specs.
- `Course` model (`apps/api/prisma/schema.prisma` lines 135–155): `code` (≤20 by contract), `name`, `description?`, `color` (default `#6366f1`), `credits?`, `isActive` (default `true`), `semesterId?` (nullable), `@@unique([userId, code])`, cascade from `User`. **No instructor field** — D111-1 adds one.
- Frontend: `entities/course/api/courseApi.ts` — `createCourse` only (SP-107E, plain-axios pattern); the `Course` type in `shared/types/academic.ts` has the 8 keys (no `instructor`/`semester`). No course pages exist; header nav is Home / Dashboard / Semesters / Profile (SP-110B).
- SP-110 (semesters) is **complete and reviewed** (PASS 2026-10-21) — the semester list/activation behavior B consumes is live; `SemesterWithCount` in `semesterApi.ts` is the shape precedent for the course read shape (D111-4).

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| D111-1 | **Add an `instructor` field to `Course`** — nullable `String?`, ≤ 100 chars after trim, with a migration. Editable on create and patch; displayed in list and detail. | **User decision 2026-10-21** (recommended option confirmed). The epic scope says "Store course information, including instructor details" but the schema had no instructor field — a scope/schema gap. Alternatives considered: cover via the free-text `description` (rejected — unstructured, the scope item stays unimplemented); drop from scope (rejected — silently narrows accepted epic scope). |
| D111-2 | **Archive = `isActive: false` via the `PATCH` partial merge; restore = `isActive: true`.** No dedicated archive/restore endpoint (mirrors D110-5's single-path state change); **no hard delete for courses in the MVP** — the epic scope is "add, edit, archive", and D110-2 already relies on courses being archivable rather than destroyable (that is what keeps semesters deletable). | Planner 2026-10-21, grounded in the schema (`isActive` default `true`) + D110-2. Reversible. |
| D111-3 | **List shows active courses by default; `includeArchived=true` opt-in.** `GET /courses` returns `isActive = true` rows unless the query param includes archived. The detail route (`GET /courses/:id`) returns the course **regardless of archive state** — archived courses remain accessible (AC-E02-05). | Planner 2026-10-21. Reversible. |
| D111-4 | **Read shape `CourseWithSemester`** = the existing 8-key `Course` + `instructor` + `semester: { id, name } \| null`. Returned by list/get/patch **and** by the extended `POST /courses` (backward-compatible: the onboarding wizard ignores the extra keys). Mirrors the SP-110 `SemesterWithCount` pattern; the service's `toResponse` comment already anticipated the shape extension. | Planner 2026-10-21, grounded in `courses.service.ts` + `semesterApi.ts`. |
| D111-5 | **Frontend home (FSD, SP-109):** API functions extend `entities/course/api/courseApi.ts`; the list/form/archive UI lives in `features/courses/`; the route screen is `pages/courses/ui/CoursesPage.tsx` at `/courses` inside `ProtectedRoute`; a "Courses" link is added to the header nav (after Semesters). | Planner 2026-10-21, grounded in the SP-109 FSD convention, the existing `entities/course` folder (SP-107E), and `Header.tsx`. |

## Shared API contract

Fixed cross-child contract. A implements; B consumes; C verifies end-to-end.
`POST /courses` is the SP-107B contract **plus** the optional `instructor` field
(D111-1); everything else about it is unchanged.

```text
GET /courses
  query: semesterId?        (optional; must be the requesting student's own
                             semester — missing or foreign → uniform 404)
         includeArchived?   (optional; "true" → include isActive = false rows;
                             default: active only, D111-3)
  200 → [ CourseWithSemester ]  ordered by name asc, then code asc
  401 → unauthenticated

GET /courses/:id
  200 → CourseWithSemester   (regardless of archive state — D111-3)
  404 → "Resource not found" — id missing OR owned by another student (uniform;
         no existence oracle)
  401 → unauthenticated

PATCH /courses/:id          (partial body; at least one field)
  body: { code?, name?, description?, credits?, color?, semesterId?,
          instructor?, isActive? }
  200 → CourseWithSemester (updated)
  400 → field-level errors map on the merged (post-patch) values: code
         (non-empty after trim, ≤ 20 chars), name (non-empty after trim,
         ≤ 100 chars), credits (0 < c ≤ 30), color (#rrggbb),
         description (≤ 2000 chars), instructor (≤ 100 chars)
  404 → uniform "Resource not found" — course missing/foreign, OR
         semesterId missing/foreign (no write in either case)
  409 → code collides with a different course of the same student
  401 → unauthenticated
  isActive: false → archive; isActive: true → restore (D111-2)

CourseWithSemester = { id, code, name, description, color, credits,
                       instructor, isActive, semesterId,
                       semester: { id, name } | null,
                       createdAt, updatedAt }
  createdAt/updatedAt ISO timestamps; semester null when unaffiliated
  (orphaned by semester deletion, D110-2).
```

Validation rules: backend `FieldValidationPipe` (whitelist +
`forbidNonWhitelisted`; unknown fields → 400) plus service re-checks (backend
authoritative); the frontend form mirrors the field rules (B).

**Downstream consumers:** SP-112 extends `GET /courses/:id` with meetings +
assignments projections (D112-3) and builds the detail page; EP03 consumes the
course list for its course picker.

## Source requirements and test traceability

Epic acceptance criteria (original wording in
[EP02](../../../epics/EP02-semester-and-course-management.md#acceptance-criteria);
stable IDs per the [EP02 breakdown](../README.md)):

| Req | Requirement (original wording) | Owning children |
|---|---|---|
| AC-E02-02 | Courses belong to a valid semester owned by the student. | A (ownership check on create/patch; read routes principal-scoped), B (semester picker offers only the student's semesters), C (cross-student proof) |
| AC-E02-03 | Students can create and edit course information. | A (API), B (UI), C (integrated proof) |
| AC-E02-05 | Archived courses remain accessible with historical data. | A (detail + `includeArchived` list), B (show-archived toggle, archived badge), C (proof) |

AC-E02-01 is owned by SP-110 (implemented, reviewed PASS 2026-10-21).
AC-E02-04/06 are owned by SP-112 (proposed stories 5–6). The epic defines no
test requirements; story-level test obligations are owned per child below.

Shared DoD ([docs/epics/README.md](../../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | A (API behavior), B (UI behavior), C (integrated) |
| 2 invalid-input validation | A (DTO + service re-checks), B (form client-side) |
| 3 student data scoping | A (every route principal-scoped; uniform 404), C (cross-student proof) |
| 4 actionable API errors | A (field-level 400, specific 409, uniform 404), B (display) |
| 5 loading/empty/error states | B (page + form states), C (integrated) |
| 6 keyboard accessibility | B (list, form, toggle, dialogs) |
| 7 responsive layouts | B (mobile + desktop) |
| 8 automated business-rule tests | A (unit + data-scoping), B (component), C (e2e) |
| 9 API/migration documentation | A (contract in this README; migration = new `instructor` column, D111-1) |
| 10 integrated development review | C (manual browser sign-off) + the combined parent review |

## Security invariants and counterexamples

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| No cross-student course read/update | Student B requests student A's course id via GET/PATCH | every route scopes on the JWT principal: `findFirst({ where: { id, userId } })`; `updateMany` carries `userId` in the where; a miss → uniform 404 `Resource not found` — B never learns A's course exists | A (service unit + data-scoping spec), C (two-student HTTP matrix) |
| `semesterId` must be the student's own semester | Client creates/patches a course with another student's semester id | ownership predicate in the query (`findFirst({ where: { id, userId } })`); a miss → uniform 404 before anything is written (no existence oracle) | A (unit + data-scoping), C |
| Archiving never destroys course data | Student archives a course, then reads it back | archive is a flag flip (`isActive: false`); the row survives and is returned by the detail route and the `includeArchived` list | A (unit + data-scoping), C (e2e) |
| Per-student code uniqueness | Two students both use `CS101`; one student tries `CS101` twice | `@@unique([userId, code])` → 409 within one student, allowed across students | A (unit + data-scoping) |

## Plan correction log

(Planning-time log was empty. Entries below are appended with stable IDs;
original findings are preserved, never overwritten.)

| ID | Source | Original finding | Consequence | Disposition |
|---|---|---|---|---|
| F-111R-1 | Final combined parent review 2026-10-22 ([review](./artifacts/SP-111/review.md)) | Required implementation deliverables (parent index, A/B/C records + checkpoints) describe the course shape as "13-key" and the baseline as "8-key"; verified actuals are **12** and **9** | Completion evidence misstates the delivered API shape | **Closed by user waiver** (user, 2026-10-22 — confirmed documentation-only inaccuracy, directed to bypass; no fix round). Waiver scope: descriptive key-count labels only — the binding contract enumeration, code, and test assertions are all consistent at 12 keys; no functional/security/test impact. Labels remain in the tree as-is |
| F-111R-2 | Same review | The same off-by-one labels in code comments/test titles of SP-111-changed files | Cosmetic | **Accepted as-is** (same user decision 2026-10-22; polish — tests assert the correct 12 keys) |
| F-111R-3 | Same review | Planning prose describes the baseline as "8 keys" (README L54/L56/L66, A ticket L101, B ticket L86); D111-4 omits `semesterId` from the added-keys list | Cosmetic | **Accepted as-is** (same user decision 2026-10-22; polish — the binding 12-key enumeration block is correct) |

## Quality gate (2026-10-21)

| Gate | Status | Evidence / limitation |
|---|---|---|
| 1. Child separation and sizing | Pass | Three children, each with a sizing block grounded in inspected code. Concrete split rationale: A and B are substantial, independently testable outcomes in different layers (backend routes/validation/migration vs page/components/a11y), each ~2.5–3 h within the 1–3 h target; C is a real verification outcome (new e2e spec + manual DoD-10 sign-off + parent index — the SP-110C precedent), not a status child. No README-only/status-only children; archive is one atomic flag flip inside A's patch path, not its own child. |
| 2. Original AC/TR coverage | Pass | AC-E02-02/03/05 owned by A/B/C as above; AC-E02-01 owned by SP-110 (done); AC-E02-04/06 owned by SP-112 (planned the same pass). The epic defines no TRs. |
| 3. Applicable DoD, incl. item 10 | Pass | DoD map above: 1–8 owned by A/B/C as applicable, 9 by A (instructor migration, D111-1), 10 by C + the combined parent review. |
| 4. Contract consistency and integration ownership | Pass | One shared contract section; A implements, B consumes (field-by-field against each child's ACs), C is the named integration owner with explicit dependencies on A + B. |
| 5. Code paths inspected | Pass | `apps/api/src/modules/courses/{courses.controller.ts,courses.service.ts,dto/create-course.dto.ts}` + both spec files, `apps/api/prisma/schema.prisma` (`Course` lines 135–155, `Assignment` lines 161–181), `apps/web/src/entities/course/api/courseApi.ts`, `apps/web/src/entities/semester/api/semesterApi.ts` (`SemesterWithCount` precedent), `shared/types/academic.ts`, `widgets/header/ui/Header.tsx`, the SP-110 breakdown (pattern + D110 decisions), the EP02 baseline. Unverified: none material. |
| 6. Feature-specific risks/counterexamples | Pass | Four invariants with concrete counterexamples, mechanisms, and owning tests (data CRUD/ownership, reference ownership, archive data-preservation, per-student uniqueness). |
| 7. Dependency mapping and sequencing | Pass | A → B → C, one sequential writer; upstream SP-107B/SP-104/SP-109/SP-110 all implemented in code (SP-104 + SP-109 + SP-110 reviewed; SP-107 parent review pending — recorded in SP-110's queue, not a blocker per delivery-state). SP-112 depends on this parent's A. |
| 8. Material decisions | Pass | D111-1 (instructor field — persisted data + public contract) **user-confirmed 2026-10-21**. D111-2…5 are planner decisions, each grounded and marked reversible. No open material question. |
| 9. Correction log | Pass | Empty at planning time; no findings to correct. |
| 10. Jira identity/sync | Not applicable | No sync authorized for this planning task. Parent + children are `Pending creation`; no duplicate keys, no tracker mutation. |

**Outcome:** **Plan Ready** — all applicable planning gate rows pass; D111-1
user-confirmed 2026-10-21; no unresolved material planning findings.
Implementation is **not blocked**: all upstream children (SP-107B, SP-104,
SP-109, SP-110) are implemented in code. No implementation or passing tests are
claimed; the plan approves planning obligations only. Next actionable:
**SP-111A** (execution queue).

## Final implementation review unit

- **Parent:** SP-111 — `docs/stories/EP02/SP-111/`
- **In scope:** SP-111A, SP-111B, SP-111C (all children + integration)
- **Integration/index owner:** SP-111C (writes the parent index at
  `./artifacts/SP-111/implementation.md`)
- **Gate:** one combined SP-111 review after every child is implemented
  (`./artifacts/SP-111/review.md` + `walkthrough.md`); child implementation
  completion unblocks dependent work, but only the passing combined review
  establishes sign-off.
