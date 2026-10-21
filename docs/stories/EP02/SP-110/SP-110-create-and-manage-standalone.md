# SP-110: Create and Manage Semesters (parent)

**Story ID:** SP-110
**Parent epic:** [EP02: Semester & Course Management](../../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18)
**Milestone:** M1
**Type:** Parent coordination record — **not** an implementation ticket and **not** a Jira implementation issue
**Status:** Implemented 2026-10-20 (A/B/C); final combined parent review **PASS** 2026-10-21 (report `./artifacts/SP-110/review.md`; walkthrough `./artifacts/SP-110/walkthrough.md`) — complete
**Jira key:** Pending creation

## Scope

The student's semester management surface: the full lifecycle of their
semesters — list, create, edit, activate (single "current" semester), delete —
via the API (A) and the `/semesters` page (B), verified end-to-end (C). This
is EP02's proposed story 1.

## Children

| Child | Layer | One line |
|---|---|---|
| [SP-110A](./SP-110A-semester-management-api.md) | Backend | Extend the SP-107B semesters module with list/get/patch/delete + single-active activation, all principal-scoped |
| [SP-110B](./SP-110B-semester-management-ui.md) | Frontend | `/semesters` page: list, create/edit form, activate, delete confirmation, states, a11y, header link |
| [SP-110C](./SP-110C-semester-integration-signoff.md) | Integration | Real-Postgres e2e lifecycle + cross-student matrix + manual sign-off (DoD 10) + parent index |

Sequence A → B → C, one sequential implementer. The
[breakdown README](./README.md) owns the execution queue, decision register,
shared API contract, traceability, correction log, and the review gate.

## Out of scope (owned elsewhere)

- The `POST /semesters` create endpoint — SP-107B (EP01, implemented);
  unchanged (D110-5).
- All course-side behavior (create/edit/archive/meetings/views) — EP02
  proposed stories 2–6, a later planning pass.
- The onboarding wizard's semester step — SP-107D (EP01); untouched.
- Semester consumption by calendar/dashboard — EP04/EP05.
