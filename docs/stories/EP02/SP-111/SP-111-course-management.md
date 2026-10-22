# SP-111: Course Management (Create, Edit, Archive)

**Story ID:** SP-111 (parent coordination record — **not** an implementation ticket; has no Jira issue of its own)
**Epic:** [EP02: Semester & Course Management](../../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18)
**Milestone:** M1
**Covers epic proposed stories:** 2 (create a course), 3 (edit course information), 4 (archive and restore courses)
**Status:** Complete 2026-10-22 — all children implemented; final combined parent review **PASS** (F-111R-1 closed by user waiver; F-111R-2/3 accepted as-is). See the [breakdown README](./README.md) for the queue, decisions, contract, and quality gate; [final review](./artifacts/SP-111/review.md) + [walkthrough](./artifacts/SP-111/walkthrough.md).

## Purpose

Coordinate the course-management children so the epic's course CRUD scope
(deliver one coherent, reviewed outcome) is delivered by a single sequential
implementer and signed off by one combined parent review.

## Children

| ID | Layer | One-line scope |
|---|---|---|
| [SP-111A](./SP-111A-course-management-api.md) | Backend | Extend the `courses` module: list (semester + archive filters), get, patch (partial merge incl. archive/restore); add the `instructor` column (D111-1, migration) |
| [SP-111B](./SP-111B-course-management-ui.md) | Frontend | `/courses` page (FSD): list with color chip + semester + archived toggle, create/edit form (incl. instructor), archive/restore; states, a11y, responsive; header nav link |
| [SP-111C](./SP-111C-course-integration-signoff.md) | Integration | Real-Postgres e2e lifecycle + cross-student matrix + archive-access proof; manual browser sign-off (DoD 10); parent index |

Sequence: A → B → C. C is the named integration owner.

## Review unit

One combined SP-111 review after every child and the integration obligation are
implemented: `./artifacts/SP-111/review.md` + `./artifacts/SP-111/walkthrough.md`
(both saved and verified before `Reviewed`). No per-child review gates.

## Execution queue

Owned by the [breakdown README](./README.md#execution-queue).
