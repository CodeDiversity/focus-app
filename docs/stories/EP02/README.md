# EP02 Story Breakdown — Semester & Course Management

**Epic:** [EP02: Semester & Course Management](../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18)
**Milestone:** M1 (functional academic tracker)
**Epic dependency:** EP01 (Authentication & Onboarding) — complete in code (see baseline)
**Status:** **EP02 complete 2026-10-23** — all six proposed stories broken down, implemented, and reviewed. Story 1 → [SP-110](./SP-110/README.md) (implemented + reviewed PASS 2026-10-21). Stories 2–4 → [SP-111](./SP-111/README.md) (implemented + final combined parent review PASS 2026-10-22). Stories 5–6 → [SP-112](./SP-112/README.md) (planned 2026-10-21; implemented + final combined parent review PASS 2026-10-23, DoD 10 ratified). Sequencing: SP-110 → SP-111 → SP-112. Story 7 → [SP-126](./SP-126/README.md) — **Refined 2026-10-28** (ui-refiner pass complete; Ready to code; presentation pass over the `/courses` page, user request to match the redesigned Assignments page).

## Code baseline (2026-10-20)

EP01 delivered the onboarding-minimal academic structure that EP02 **extends, not duplicates** (D107-9, EP01/SP-107):

- `apps/api/src/modules/semesters/` — `POST /semesters` only (SP-107B, implemented 2026-10-18, commit `03a412a`). `Semester` model: `@db.Date` start/end dates (D107-7), `isActive` (schema default `false`), `@@unique([userId, name])`, cascade from `User`.
- `apps/api/src/modules/courses/` — `POST /courses` only (SP-107B). `Course.semesterId` is **nullable** (a course can exist without a semester — D107-6), `@@unique([userId, code])`, `isActive` default `true`.
- `apps/web/src/entities/{semester,course}/api/` — `createSemester`/`createCourse` only (SP-107D/E); the `Semester`/`Course` types live in `shared/types/academic.ts`.
- The FSD layer structure (SP-109, implemented + reviewed PASS 2026-10-17) is the home for all EP02 frontend work.
- No `/semesters` or course pages exist yet; the header nav is Home / Dashboard / Profile. *(Superseded — re-verified 2026-10-23: SP-110B/SP-111B since added the `/semesters` and `/courses` pages; the header nav is Home / Dashboard / Semesters / Courses / Profile.)*

EP01 is complete in code (SP-101…SP-109 all implemented; SP-107 awaits its combined parent review with a human DoD-10 gate — a review gap, not an implementation gap). Per delivery-state, an implemented child unblocks dependent work without formal review: **EP02 implementation is not blocked by EP01 review state.**

## Stories

| Story | Epic proposed story | Breakdown | Jira |
|---|---|---|---|
| [SP-110](./SP-110/README.md) | 1. Create and manage semesters | [3 children](./SP-110/README.md) (A backend, B frontend, C integration) — implemented + reviewed PASS 2026-10-21 | Pending creation |
| [SP-111](./SP-111/README.md) | 2. Create a course · 3. Edit course information · 4. Archive and restore courses | [3 children](./SP-111/README.md) (A backend, B frontend, C integration) — implemented + reviewed PASS 2026-10-22 | Pending creation |
| [SP-112](./SP-112/README.md) | 5. Manage recurring class meetings · 6. Course list and detail views | [3 children](./SP-112/README.md) (A backend, B frontend, C integration) — implemented + reviewed PASS 2026-10-23 (DoD 10 ratified) | Pending creation |
| [SP-126](./SP-126/README.md) | 7. Course page experience (post-completion user request 2026-10-27) | [1 frontend story](./SP-126/README.md) — **Implemented** (commit 914a5d2, 2026-10-28; awaiting parent review). Presentation pass; no new epic AC. | Pending creation |

All six proposed stories are now broken down — none deferred or dropped.
Story 7 (SP-126) is a new post-completion request on the `/courses` surface,
added after the epic closed.
Sequencing intent: semesters first (SP-110, complete) — courses attach to
semesters and consume the semester list/activation behavior; course management
(SP-111) before meetings + course detail (SP-112), because meetings attach to
courses and the detail page is the meetings' home (D112-2/3).

## Epic acceptance criteria — ownership

| Epic AC (original wording) | Stable ID | Owner |
|---|---|---|
| Students can create semesters with start and end dates. | AC-E02-01 | Creation: SP-107B (EP01, implemented). Management (list/get/update/delete/activate): **SP-110** A/B/C. |
| Courses belong to a valid semester owned by the student. | AC-E02-02 | Creation check: SP-107B (implemented). Ongoing enforcement: **SP-111** A/B/C. |
| Students can create and edit course information. | AC-E02-03 | **SP-111** A/B/C (incl. the new `instructor` field, D111-1). |
| Students can add recurring class meetings with start and end times. | AC-E02-04 | **SP-112** A/B/C. |
| Archived courses remain accessible with historical data. | AC-E02-05 | **SP-111** A/B/C (archive/restore + show-archived). Boundary: SP-110C proves courses **survive** semester deletion (D110-2). |
| Course details display related assignments and class meetings. | AC-E02-06 | **SP-112** A/B/C (assignments read-only until EP03 builds management — D112-3/6). |

The epic defines no test requirements; story-level test obligations are owned per child in the [SP-110](./SP-110/README.md), [SP-111](./SP-111/README.md), and [SP-112](./SP-112/README.md) breakdowns.

## Execution queue

SP-110 is complete (implemented + reviewed PASS 2026-10-21 — queue at
[SP-110/README.md](./SP-110/README.md#execution-queue)). SP-111 is complete
(implemented + final combined parent review PASS 2026-10-22 — queue at
[SP-111/README.md](./SP-111/README.md#execution-queue)). SP-112 is complete
(implemented + final combined parent review PASS 2026-10-23, DoD 10 ratified —
queue at [SP-112/README.md](./SP-112/README.md#execution-queue)).

**EP02 complete 2026-10-23** — all six proposed stories implemented and
reviewed. **Next action: None** — no EP02 work remains; the next milestone
epic is [EP03](../../epics/EP03-assignment-and-task-management.md)
(Assignment & Task Management), whose EP02 dependency is now satisfied.

SP-126 (story 7, post-completion user request 2026-10-27) is **Refined** — the
ui-refiner pass (D126-5) is complete (2026-10-28) and the story is Ready to
code. Queue at [SP-126/README.md](./SP-126/README.md#execution-queue). It has no
implementation dependency (SP-125 reviewed `9dce1c4` supplies the design
reference in code) and no backend work (D126-1).

## Quality gate — SP-126 plan (2026-10-27)

**Draft** — the story is `Needs refinement` on D126-5 (ui-refiner pass
precedes implementation); the two material product decisions are user-confirmed
2026-10-27 (D126-1 skip the pending-assignment count; D126-2 menu = Edit +
Archive/Restore, no hard delete). D126-3 (client-side search/semester filter)
and D126-4 (Assignments-consistent shell/toolbar) are planner-recorded and
grounded. No implementation blocker. Full gate table:
[SP-126 README](./SP-126/README.md#quality-gate-2026-10-27). No Jira sync was
authorized; the SP-126 key is `Pending creation`.

## Quality gate — SP-110 plan (2026-10-20)

**Plan Ready** — D110-1 (single-active semester) and D110-2 (delete orphans courses) user-confirmed 2026-10-20; implementation not blocked (all upstream children implemented in code). Full gate table: [SP-110 README](./SP-110/README.md#quality-gate-2026-10-20). No Jira sync was authorized for this planning task; all SP-110 keys are `Pending creation`.

## Quality gate — SP-111 plan (2026-10-21)

**Plan Ready** — D111-1 (new nullable `instructor` column on `Course` + migration) user-confirmed 2026-10-21; D111-2…5 planner-recorded (reversible). Implementation not blocked (SP-107B/SP-104/SP-109/SP-110 all implemented in code). Full gate table: [SP-111 README](./SP-111/README.md#quality-gate-2026-10-21). No Jira sync was authorized for this planning task; all SP-111 keys are `Pending creation`.

## Quality gate — SP-112 plan (2026-10-21)

**Plan Ready** — D112-1…6 all planner-recorded (grounded in the
`AvailabilitySlot` precedent / epic text, reversible; no material decision
needs user confirmation). Implementation **unblocked 2026-10-23** — SP-111
complete (implemented + reviewed PASS 2026-10-22); the plan was re-verified
against the post-SP-111 code the same day (baseline holds; one cosmetic
ticket-path fix, F-112P-1). Full gate table: [SP-112 README](./SP-112/README.md#quality-gate-2026-10-21). No Jira sync was authorized for this planning task; all SP-112 keys are `Pending creation`.
