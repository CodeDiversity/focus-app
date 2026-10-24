# SP-112: Recurring Class Meetings & Course Detail

**Story ID:** SP-112 (parent coordination record — **not** an implementation ticket; has no Jira issue of its own)
**Epic:** [EP02: Semester & Course Management](../../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18)
**Milestone:** M1
**Covers epic proposed stories:** 5 (manage recurring class meetings), 6 (course list and detail views)
**Status:** **Complete 2026-10-23** — all children implemented (A `080f2e9`, B `8bbafb5`, C `469a829`) + combined parent review PASS (DoD 10 ratified 2026-10-23) — see the [breakdown README](./README.md) for the queue, decisions, contract, and quality gate.

## Purpose

Coordinate the meetings + course-detail children so the epic's final scope
(recurring weekly classes + the course detail view showing meetings and
assignments) is delivered by a single sequential implementer and signed off by
one combined parent review.

## Children

| ID | Layer | One-line scope |
|---|---|---|
| [SP-112A](./SP-112A-class-meetings-api.md) | Backend | New `ClassMeeting` model + migration (AvailabilitySlot time precedent, D112-1); meeting CRUD nested under course routes (D112-2); extend `GET /courses/:id` with meetings + read-only assignments projections (D112-3) |
| [SP-112B](./SP-112B-course-detail-ui.md) | Frontend | `/courses/:id` detail page (FSD): course header, meetings section (add/edit/delete with weekday + times), read-only assignments section + empty state; list rows become detail links |
| [SP-112C](./SP-112C-meetings-integration-signoff.md) | Integration | Real-Postgres e2e (meeting lifecycle + validation + cross-student + detail projections) + manual browser sign-off (DoD 10); parent index |

Sequence: **SP-111 (A→B→C) → SP-112 (A→B→C)**. C is the named integration
owner.

## Review unit

One combined SP-112 review after every child and the integration obligation are
implemented: `./artifacts/SP-112/review.md` + `./artifacts/SP-112/walkthrough.md`
(both saved and verified before `Reviewed`). No per-child review gates.

## Execution queue

Owned by the [breakdown README](./README.md#execution-queue).
