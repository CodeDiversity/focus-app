# EP02 Story Breakdown — Semester & Course Management

**Epic:** [EP02: Semester & Course Management](../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18)
**Milestone:** M1 (functional academic tracker)
**Epic dependency:** EP01 (Authentication & Onboarding) — complete in code (see baseline)
**Status:** Planned 2026-10-20 — proposed story 1 broken down as [SP-110](./SP-110/README.md) (3 children; decisions user-confirmed, **Plan Ready**); proposed stories 2–6 await a later EP02 planning pass.

## Code baseline (2026-10-20)

EP01 delivered the onboarding-minimal academic structure that EP02 **extends, not duplicates** (D107-9, EP01/SP-107):

- `apps/api/src/modules/semesters/` — `POST /semesters` only (SP-107B, implemented 2026-10-18, commit `03a412a`). `Semester` model: `@db.Date` start/end dates (D107-7), `isActive` (schema default `false`), `@@unique([userId, name])`, cascade from `User`.
- `apps/api/src/modules/courses/` — `POST /courses` only (SP-107B). `Course.semesterId` is **nullable** (a course can exist without a semester — D107-6), `@@unique([userId, code])`, `isActive` default `true`.
- `apps/web/src/entities/{semester,course}/api/` — `createSemester`/`createCourse` only (SP-107D/E); the `Semester`/`Course` types live in `shared/types/academic.ts`.
- The FSD layer structure (SP-109, implemented + reviewed PASS 2026-10-17) is the home for all EP02 frontend work.
- No `/semesters` or course pages exist yet; the header nav is Home / Dashboard / Profile.

EP01 is complete in code (SP-101…SP-109 all implemented; SP-107 awaits its combined parent review with a human DoD-10 gate — a review gap, not an implementation gap). Per delivery-state, an implemented child unblocks dependent work without formal review: **EP02 implementation is not blocked by EP01 review state.**

## Stories

| Story | Epic proposed story | Breakdown | Jira |
|---|---|---|---|
| [SP-110](./SP-110/README.md) | 1. Create and manage semesters | [3 children](./SP-110/README.md) (A backend, B frontend, C integration) | Pending creation |
| — | 2. Create a course | Not yet broken down | Pending creation |
| — | 3. Edit course information | Not yet broken down | Pending creation |
| — | 4. Archive and restore courses | Not yet broken down | Pending creation |
| — | 5. Manage recurring class meetings | Not yet broken down | Pending creation |
| — | 6. Course list and detail views | Not yet broken down | Pending creation |

Proposed stories 2–6 remain the epic's accepted scope — not deferred or dropped; they await a later planning pass (owner: planner). Sequencing intent: semesters first (SP-110) — courses attach to semesters, and the course stories will consume the semester list/activation behavior.

## Epic acceptance criteria — ownership

| Epic AC (original wording) | Stable ID | Owner |
|---|---|---|
| Students can create semesters with start and end dates. | AC-E02-01 | Creation: SP-107B (EP01, implemented). Management (list/get/update/delete/activate): **SP-110** A/B/C. |
| Courses belong to a valid semester owned by the student. | AC-E02-02 | Creation check: SP-107B (implemented). Ongoing enforcement: course stories (proposed 2–4; not yet broken down). |
| Students can create and edit course information. | AC-E02-03 | Course stories (proposed 2–3; not yet broken down). |
| Students can add recurring class meetings with start and end times. | AC-E02-04 | Meetings story (proposed 5; not yet broken down). |
| Archived courses remain accessible with historical data. | AC-E02-05 | Archive story (proposed 4; not yet broken down). Boundary: SP-110C proves courses **survive** semester deletion (D110-2). |
| Course details display related assignments and class meetings. | AC-E02-06 | Course views story (proposed 6; not yet broken down). |

The epic defines no test requirements; story-level test obligations are owned per child in the [SP-110 breakdown](./SP-110/README.md).

## Execution queue

The SP-110 delivery home owns the queue: [docs/stories/EP02/SP-110/README.md](./SP-110/README.md#execution-queue).

## Quality gate — SP-110 plan (2026-10-20)

**Plan Ready** — D110-1 (single-active semester) and D110-2 (delete orphans courses) user-confirmed 2026-10-20; implementation not blocked (all upstream children implemented in code). Full gate table: [SP-110 README](./SP-110/README.md#quality-gate-2026-10-20). No Jira sync was authorized for this planning task; all SP-110 keys are `Pending creation`.
